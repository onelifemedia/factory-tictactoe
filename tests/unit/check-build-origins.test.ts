// F-012 R-012 R-013: the origin guard scans dist/ and reports any script,
// stylesheet, iframe, CSS url(...) or JavaScript import that points to
// another origin; the CLI exits 1 on any finding. Fixtures live in temporary
// directories.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { findExternalReferences } from "../../scripts/check-build-origins.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const scriptPath = path.join(projectRoot, "scripts", "check-build-origins.mjs");

const fixtureDirectories: string[] = [];

function createFixtureDirectory(): string {
  const fixtureDirectory = mkdtempSync(
    path.join(tmpdir(), "check-build-origins-"),
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

function writeHtmlPage(fixtureDirectory: string, headMarkup: string): void {
  writeFixtureFile(
    fixtureDirectory,
    "index.html",
    `<!doctype html>\n<html lang="en">\n<head>\n${headMarkup}\n</head>\n<body><a href="#board">Skip</a></body>\n</html>\n`,
  );
}

function writeCleanBuild(fixtureDirectory: string): void {
  writeHtmlPage(
    fixtureDirectory,
    [
      '<script type="module" crossorigin src="./assets/index-abc123.js"></script>',
      '<link rel="stylesheet" crossorigin href="./assets/index-def456.css">',
      '<link rel="icon" href="/favicon.svg">',
      '<iframe src="#help"></iframe>',
    ].join("\n"),
  );
  writeFixtureFile(
    fixtureDirectory,
    "assets/index-abc123.js",
    'import { board } from "./board-789.js";\nconst lazyModule = import("./lazy-000.js");\nconsole.log(board, lazyModule);\n',
  );
  writeFixtureFile(
    fixtureDirectory,
    "assets/board-789.js",
    "export const board = [];\n",
  );
  writeFixtureFile(
    fixtureDirectory,
    "assets/index-def456.css",
    'body{background:url(./pattern.svg)}\n.mark{background:url("#gradient")}\n',
  );
}

function findReferences(directory: string): readonly unknown[] {
  return findExternalReferences(directory);
}

function describeFindings(findings: readonly unknown[]): string {
  return JSON.stringify(findings);
}

function runOriginCheck(
  commandArguments: readonly string[],
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [scriptPath, ...commandArguments], {
    cwd: projectRoot,
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const fixtureDirectory of fixtureDirectories.splice(0)) {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

describe("findExternalReferences (F-012 R-012 R-013)", () => {
  it("allows relative, root-relative and fragment-only references in HTML, CSS and JavaScript (F-012 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);

    expect(findReferences(fixtureDirectory)).toEqual([]);
  });

  it.each([
    {
      referenceName: "an absolute https script",
      markup: '<script src="https://cdn.example.com/x.js"></script>',
      externalUrl: "https://cdn.example.com/x.js",
    },
    {
      referenceName: "a protocol-relative stylesheet link",
      markup: '<link rel="stylesheet" href="//fonts.example.com/f.css">',
      externalUrl: "//fonts.example.com/f.css",
    },
    {
      referenceName: "an absolute https iframe",
      markup: '<iframe src="https://example.com"></iframe>',
      externalUrl: "https://example.com",
    },
    {
      referenceName: "an absolute http script",
      markup: '<script src="http://cdn.example.com/y.js"></script>',
      externalUrl: "http://cdn.example.com/y.js",
    },
    {
      referenceName: "a data: script",
      markup: '<script src="data:text/javascript,alert(1)"></script>',
      externalUrl: "data:text/javascript,alert(1)",
    },
  ])(
    "reports $referenceName in HTML (F-012 R-012 R-013)",
    ({ markup, externalUrl }) => {
      const fixtureDirectory = createFixtureDirectory();
      writeCleanBuild(fixtureDirectory);
      writeHtmlPage(fixtureDirectory, markup);

      const findings = findReferences(fixtureDirectory);

      expect(findings).toHaveLength(1);
      expect(describeFindings(findings)).toContain(externalUrl);
    },
  );

  it("reports a CSS url(...) that points to another origin, such as a web font (F-012 R-012 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(
      fixtureDirectory,
      "assets/fonts.css",
      '@font-face{font-family:Brand;src:url("https://fonts.example.com/brand.woff2")}\n',
    );

    const findings = findReferences(fixtureDirectory);

    expect(findings).toHaveLength(1);
    expect(describeFindings(findings)).toContain(
      "https://fonts.example.com/brand.woff2",
    );
  });

  it("reports JavaScript import(...) and from specifiers that point to another origin (F-012 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(
      fixtureDirectory,
      "assets/remote.js",
      'import { track } from "https://analytics.example.com/track.js";\nconst widget = import("//widgets.example.com/widget.js");\nconsole.log(track, widget);\n',
    );

    const findings = findReferences(fixtureDirectory);

    expect(findings).toHaveLength(2);
    expect(describeFindings(findings)).toContain(
      "https://analytics.example.com/track.js",
    );
    expect(describeFindings(findings)).toContain(
      "//widgets.example.com/widget.js",
    );
  });
});

describe("check-build-origins CLI (F-012 R-012 R-013)", () => {
  it("exits 0 on a clean directory (F-012 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);

    const result = runOriginCheck([fixtureDirectory]);

    expect(result.status).toBe(0);
  });

  it("exits 1 on a finding and prints it (F-012 R-012 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeHtmlPage(
      fixtureDirectory,
      '<script src="https://cdn.example.com/x.js"></script>',
    );

    const result = runOriginCheck([fixtureDirectory]);

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "https://cdn.example.com/x.js",
    );
  });

  it("fails with a non-zero exit when the directory does not exist (F-012 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    const missingDirectory = path.join(fixtureDirectory, "not-built");

    const result = runOriginCheck([missingDirectory]);

    expect(result.status).not.toBe(0);
    expect(result.status).not.toBeNull();
  });
});
