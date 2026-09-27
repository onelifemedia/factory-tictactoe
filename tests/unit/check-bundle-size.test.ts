// F-012 R-011: the bundle size guard sums the gzipped size of every
// dist/**/*.js file and fails (exit 1) at or over the 51,200-byte limit, or
// when no JavaScript is found. Fixtures live in temporary directories.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { measureGzippedJavaScript } from "../../scripts/check-bundle-size.mjs";

interface GzippedFile {
  path: string;
  gzippedBytes: number;
}

interface BundleMeasurement {
  files: GzippedFile[];
  totalBytes: number;
}

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const scriptPath = path.join(projectRoot, "scripts", "check-bundle-size.mjs");
const buildDirectory = path.join(projectRoot, "dist");
const BUNDLE_LIMIT_BYTES = 51_200;
const INCOMPRESSIBLE_BYTE_COUNT = 60_000;

const fixtureDirectories: string[] = [];

function createFixtureDirectory(): string {
  const fixtureDirectory = mkdtempSync(
    path.join(tmpdir(), "check-bundle-size-"),
  );
  fixtureDirectories.push(fixtureDirectory);
  return fixtureDirectory;
}

function writeFixtureFile(
  fixtureDirectory: string,
  relativePath: string,
  contents: string,
): void {
  const filePath = path.join(fixtureDirectory, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

function runBundleSizeCheck(
  commandArguments: readonly string[],
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [scriptPath, ...commandArguments], {
    cwd: projectRoot,
    encoding: "utf8",
  });
}

function measureFixture(directory: string): BundleMeasurement {
  return measureGzippedJavaScript(directory);
}

afterEach(() => {
  for (const fixtureDirectory of fixtureDirectories.splice(0)) {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

describe("measureGzippedJavaScript (F-012 R-011)", () => {
  it("reports every JavaScript file under the directory, nested ones included, and totals their gzipped sizes (F-012 R-011)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeFixtureFile(fixtureDirectory, "main.js", 'console.log("main");\n');
    writeFixtureFile(
      fixtureDirectory,
      "assets/chunk.js",
      'export const greeting = "hello";\n',
    );
    writeFixtureFile(fixtureDirectory, "assets/style.css", "body{margin:0}\n");
    writeFixtureFile(fixtureDirectory, "index.html", "<!doctype html>\n");

    const measurement = measureFixture(fixtureDirectory);

    const filePaths = measurement.files.map((file) => file.path).sort();
    expect(filePaths).toEqual([
      expect.stringMatching(/assets[\\/]chunk\.js$/),
      expect.stringMatching(/(^|[\\/])main\.js$/),
    ]);
    for (const file of measurement.files) {
      expect(file.gzippedBytes).toBeGreaterThan(0);
    }
    const summedBytes = measurement.files.reduce(
      (total, file) => total + file.gzippedBytes,
      0,
    );
    expect(measurement.totalBytes).toBe(summedBytes);
  });

  it("measures random, incompressible JavaScript as larger than the limit (F-012 R-011)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeFixtureFile(
      fixtureDirectory,
      "large.js",
      `/* ${randomBytes(INCOMPRESSIBLE_BYTE_COUNT).toString("base64")} */\n`,
    );

    const measurement = measureFixture(fixtureDirectory);

    expect(measurement.files).toHaveLength(1);
    expect(measurement.totalBytes).toBeGreaterThan(BUNDLE_LIMIT_BYTES);
  });

  it("reports no files and a zero total for a directory without JavaScript (F-012 R-011)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeFixtureFile(fixtureDirectory, "index.html", "<!doctype html>\n");

    const measurement = measureFixture(fixtureDirectory);

    expect(measurement.files).toEqual([]);
    expect(measurement.totalBytes).toBe(0);
  });
});

describe("check-bundle-size CLI (F-012 R-011)", () => {
  it("passes a small JavaScript file and prints the file and the total (F-012 R-011)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeFixtureFile(fixtureDirectory, "main.js", 'console.log("main");\n');
    const measurement = measureFixture(fixtureDirectory);

    const result = runBundleSizeCheck([fixtureDirectory]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("main.js");
    expect(result.stdout).toContain(String(measurement.totalBytes));
  });

  it("fails with exit 1 on a random, incompressible file over the limit (F-012 R-011)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeFixtureFile(
      fixtureDirectory,
      "large.js",
      `/* ${randomBytes(INCOMPRESSIBLE_BYTE_COUNT).toString("base64")} */\n`,
    );

    const result = runBundleSizeCheck([fixtureDirectory]);

    expect(result.status).toBe(1);
  });

  it("fails with exit 1 when the total equals the limit given by --limit, and passes one byte under it (F-012 R-011)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeFixtureFile(fixtureDirectory, "main.js", 'console.log("main");\n');
    const { totalBytes } = measureFixture(fixtureDirectory);

    const resultAtLimit = runBundleSizeCheck([
      fixtureDirectory,
      "--limit",
      String(totalBytes),
    ]);
    const resultUnderLimit = runBundleSizeCheck([
      fixtureDirectory,
      "--limit",
      String(totalBytes + 1),
    ]);

    expect(resultAtLimit.status).toBe(1);
    expect(resultUnderLimit.status).toBe(0);
  });

  it("fails with exit 1 on an empty directory, so an empty build cannot pass (F-012 R-011)", () => {
    const fixtureDirectory = createFixtureDirectory();

    const result = runBundleSizeCheck([fixtureDirectory]);

    expect(result.status).toBe(1);
  });

  it("fails with a non-zero exit when the directory does not exist (F-012 R-011)", () => {
    const fixtureDirectory = createFixtureDirectory();
    const missingDirectory = path.join(fixtureDirectory, "not-built");

    const result = runBundleSizeCheck([missingDirectory]);

    expect(result.status).not.toBe(0);
    expect(result.status).not.toBeNull();
  });

  it.skipIf(!existsSync(buildDirectory))(
    "passes the real production build in dist/ (F-012 R-011)",
    () => {
      const measurement = measureFixture(buildDirectory);
      expect(measurement.files.length).toBeGreaterThan(0);
      expect(measurement.totalBytes).toBeLessThan(BUNDLE_LIMIT_BYTES);

      const result = runBundleSizeCheck([buildDirectory]);

      expect(result.status).toBe(0);
    },
  );
});
