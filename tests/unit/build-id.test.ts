// F-013 R-014: the production build carries a <meta name="build-id"> taken
// from the BUILD_ID environment variable (the deployed SHA), defaulting to
// "local", so the smoke test can tell which build is live.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const BUILD_TIMEOUT_MILLISECONDS = 120_000;

const outputDirectories: string[] = [];

function buildIndexHtml(buildId: string | undefined): string {
  const outputDirectory = mkdtempSync(path.join(tmpdir(), "build-id-"));
  outputDirectories.push(outputDirectory);
  const buildEnvironment: NodeJS.ProcessEnv = { ...process.env };
  delete buildEnvironment.BUILD_ID;
  if (buildId !== undefined) {
    buildEnvironment.BUILD_ID = buildId;
  }
  const result = spawnSync(
    "npx",
    ["vite", "build", "--outDir", outputDirectory, "--emptyOutDir"],
    { cwd: projectRoot, encoding: "utf8", env: buildEnvironment },
  );
  expect(result.status, result.stderr).toBe(0);
  return readFileSync(path.join(outputDirectory, "index.html"), "utf8");
}

afterEach(() => {
  for (const outputDirectory of outputDirectories.splice(0)) {
    rmSync(outputDirectory, { recursive: true, force: true });
  }
});

describe("build-id meta tag (F-013 R-014)", () => {
  it(
    'writes BUILD_ID into <meta name="build-id"> in the built index.html head (F-013 R-014)',
    () => {
      const indexHtml = buildIndexHtml("abc123");

      const metaTag = '<meta name="build-id" content="abc123">';
      expect(indexHtml).toContain(metaTag);
      expect(indexHtml.indexOf(metaTag)).toBeLessThan(
        indexHtml.indexOf("</head>"),
      );
    },
    BUILD_TIMEOUT_MILLISECONDS,
  );

  it(
    "defaults the build id to local when BUILD_ID is not set (F-013 R-014)",
    () => {
      const indexHtml = buildIndexHtml(undefined);

      expect(indexHtml).toContain('<meta name="build-id" content="local">');
    },
    BUILD_TIMEOUT_MILLISECONDS,
  );
});
