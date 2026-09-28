// F-014 R-013: the local-visuals guard scans dist/ and reports every
// @font-face rule, <img> element and CSS url() that references a file, so the
// whole look stays CSS and same-document inline SVG. The CLI exits 1 on any
// finding, and CI runs it on dist/ after the build. Fixtures live in temporary
// directories; nothing reads the real build.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { findVisualFileReferences } from "../../scripts/check-local-visuals.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const scriptPath = path.join(projectRoot, "scripts", "check-local-visuals.mjs");

const PRODUCT_LIKE_HTML = [
  "<!doctype html>",
  '<html lang="en">',
  "<head>",
  '<meta charset="utf-8">',
  '<script type="module" crossorigin src="./assets/index-abc123.js"></script>',
  '<link rel="stylesheet" crossorigin href="./assets/index-def456.css">',
  "</head>",
  "<body>",
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>',
  '<symbol id="mark-x" viewBox="0 0 100 100"><circle class="mark-backing" cx="50" cy="50" r="37"/><rect class="mark-x-bar" x="41" y="12" width="18" height="76" rx="9" transform="rotate(45 50 50)"/></symbol>',
  '<symbol id="mark-o" viewBox="0 0 100 100"><circle class="mark-backing" cx="50" cy="50" r="37"/><circle class="mark-o-ring" cx="50" cy="50" r="28"/></symbol>',
  "</defs></svg>",
  '<main class="page"><h1 class="title">Tic-tac-toe</h1>',
  '<div id="board" class="board" role="group" aria-label="Board"><button type="button" class="square" aria-label="Row 1, column 1, X"><svg class="mark mark--x" aria-hidden="true" viewBox="0 0 100 100"><use href="#mark-x"/></svg></button>',
  '<svg class="win-line" aria-hidden="true" viewBox="0 0 300 300" preserveAspectRatio="none"><path d="M268 32 L32 268"/></svg></div>',
  "</main>",
  "</body>",
  "</html>",
  "",
].join("\n");

const PRODUCT_LIKE_CSS = [
  ":root{--color-surface:#f3e8d4;--shadow-tile:0 6px 0 var(--color-tile-edge),0 8px 10px rgba(84,56,26,.25);--shadow-mark:drop-shadow(0 2px 0 rgba(43,29,19,.28))}",
  ".title{font-family:ui-rounded,system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif}",
  ".mark{filter:var(--shadow-mark)}.mark-backing{fill:var(--mark-backing,none)}",
  "",
].join("\n");

const PRODUCT_LIKE_JAVASCRIPT =
  'const piece=document.createElementNS("http://www.w3.org/2000/svg","use");piece.setAttribute("href","#mark-x");\n';

const fixtureDirectories: string[] = [];

function createFixtureDirectory(): string {
  const fixtureDirectory = mkdtempSync(
    path.join(tmpdir(), "check-local-visuals-"),
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

function writeCleanBuild(fixtureDirectory: string): void {
  writeFixtureFile(fixtureDirectory, "index.html", PRODUCT_LIKE_HTML);
  writeFixtureFile(
    fixtureDirectory,
    "assets/index-def456.css",
    PRODUCT_LIKE_CSS,
  );
  writeFixtureFile(
    fixtureDirectory,
    "assets/index-abc123.js",
    PRODUCT_LIKE_JAVASCRIPT,
  );
}

function describeFindings(findings: readonly unknown[]): string {
  return JSON.stringify(findings);
}

function runVisualsCheck(
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

describe("findVisualFileReferences accepts CSS-and-inline-SVG builds (F-014 R-013)", () => {
  it("reports nothing for product-like markup, CSS without url() and JavaScript that builds <use href='#mark-x'> (F-014 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);

    expect(findVisualFileReferences(fixtureDirectory)).toEqual([]);
  });

  it.each([
    { referenceName: "an unquoted url(#fragment)", css: ".a{fill:url(#glow)}" },
    {
      referenceName: 'a double-quoted url("#fragment")',
      css: '.a{filter:url("#soften")}',
    },
    {
      referenceName: "a single-quoted url('#fragment')",
      css: ".a{mask:url('#tile-mask')}",
    },
  ])("allows $referenceName (F-014 R-013)", ({ css }) => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(fixtureDirectory, "assets/fragments.css", css);

    expect(findVisualFileReferences(fixtureDirectory)).toEqual([]);
  });
});

describe("findVisualFileReferences reports visual files (F-014 R-013)", () => {
  it("reports an @font-face rule, even one that names a local() font (F-014 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(
      fixtureDirectory,
      "assets/fonts.css",
      '@font-face{font-family:Brand;src:local("Brand Rounded")}\n',
    );

    const findings = findVisualFileReferences(fixtureDirectory);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      file: path.join("assets", "fonts.css"),
      kind: "font-face",
    });
  });

  it("reports an @font-face rule inside an inline <style> of an HTML page (F-014 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(
      fixtureDirectory,
      "offline.html",
      "<!doctype html><style>@font-face{font-family:Brand;src:local(Brand)}</style><p>Offline</p>\n",
    );

    const findings = findVisualFileReferences(fixtureDirectory);

    expect(findings.map((finding) => finding.kind)).toEqual(["font-face"]);
    expect(findings[0]?.file).toBe("offline.html");
  });

  it.each([
    {
      referenceName: "a lower-case <img>",
      markup: '<img src="./logo.png" alt="Logo">',
    },
    {
      referenceName: "an upper-case <IMG> with no src",
      markup: '<IMG alt="" loading="lazy">',
    },
  ])("reports $referenceName element (F-014 R-013)", ({ markup }) => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(
      fixtureDirectory,
      "index.html",
      PRODUCT_LIKE_HTML.replace("</main>", `${markup}</main>`),
    );

    const findings = findVisualFileReferences(fixtureDirectory);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: "index.html", kind: "img" });
  });

  it.each([
    {
      referenceName: "an unquoted url(file.png)",
      css: ".board{background:url(file.png)}",
      fileName: "file.png",
    },
    {
      referenceName: "a double-quoted url() to a root-relative image",
      css: '.board{background-image:url("/assets/wood.jpg")}',
      fileName: "wood.jpg",
    },
    {
      referenceName: "a single-quoted url() to a font file",
      css: ".title{src:url('./brand.woff2')}",
      fileName: "brand.woff2",
    },
    {
      referenceName: "a url() to an SVG file with a fragment",
      css: ".mark{mask:url(sprites.svg#mark-x)}",
      fileName: "sprites.svg",
    },
    {
      referenceName: "a url() to another origin",
      css: ".page{background:url(https://cdn.example.com/table.webp)}",
      fileName: "table.webp",
    },
  ])("reports $referenceName in CSS (F-014 R-013)", ({ css, fileName }) => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(fixtureDirectory, "assets/extra.css", `${css}\n`);

    const findings = findVisualFileReferences(fixtureDirectory);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      file: path.join("assets", "extra.css"),
      kind: "url",
    });
    expect(describeFindings(findings)).toContain(fileName);
  });

  it("reports a file url() in an inline <style> and in a style attribute of an HTML page (F-014 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(
      fixtureDirectory,
      "index.html",
      PRODUCT_LIKE_HTML.replace(
        "</head>",
        "<style>.page{background:url(table.png)}</style></head>",
      ).replace(
        '<main class="page">',
        '<main class="page" style="background-image:url(felt.gif)">',
      ),
    );

    const findings = findVisualFileReferences(fixtureDirectory);

    expect(findings.map((finding) => finding.kind)).toEqual(["url", "url"]);
    expect(describeFindings(findings)).toContain("table.png");
    expect(describeFindings(findings)).toContain("felt.gif");
  });

  it.each([
    {
      referenceName: "an unquoted style attribute",
      markup: "<div style=background:url(wood.png)></div>",
      fileName: "wood.png",
    },
    {
      referenceName: "an SVG presentation attribute",
      markup:
        '<svg><rect fill="url(paint.svg#gradient)" width="1" height="1" /></svg>',
      fileName: "paint.svg",
    },
  ])(
    "reports a file url() in $referenceName of an HTML page (F-014 R-013, Codex F-014 C1)",
    ({ markup, fileName }) => {
      const fixtureDirectory = createFixtureDirectory();
      writeCleanBuild(fixtureDirectory);
      writeFixtureFile(
        fixtureDirectory,
        "index.html",
        PRODUCT_LIKE_HTML.replace("</main>", `${markup}</main>`),
      );
      const findings = findVisualFileReferences(fixtureDirectory);
      expect(findings.map((finding) => finding.kind)).toEqual(["url"]);
      expect(describeFindings(findings)).toContain(fileName);
    },
  );

  it("ignores url() text inside an inline script of an HTML page (F-014 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(
      fixtureDirectory,
      "index.html",
      PRODUCT_LIKE_HTML.replace(
        "</body>",
        '<script>const pattern = "url(example.png)";</script></body>',
      ),
    );
    expect(findVisualFileReferences(fixtureDirectory)).toEqual([]);
  });

  it("reports every finding across files, not only the first (F-014 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(
      fixtureDirectory,
      "assets/extra.css",
      "@font-face{font-family:Brand;src:url(brand.woff2)}\n.board{background:url(wood.png)}\n",
    );
    writeFixtureFile(
      fixtureDirectory,
      "index.html",
      PRODUCT_LIKE_HTML.replace(
        "</main>",
        '<img src="logo.png" alt=""></main>',
      ),
    );

    const findings = findVisualFileReferences(fixtureDirectory);
    const kinds = findings.map((finding) => finding.kind).sort();

    expect(kinds).toEqual(["font-face", "img", "url", "url"]);
  });
});

describe("check-local-visuals CLI (F-014 R-013)", () => {
  it("exits 0 on a clean directory (F-014 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);

    const result = runVisualsCheck([fixtureDirectory]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(fixtureDirectory);
  });

  it("exits 1 on a finding and prints the file and the reference (F-014 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    writeCleanBuild(fixtureDirectory);
    writeFixtureFile(
      fixtureDirectory,
      "assets/extra.css",
      ".board{background:url(wood.png)}\n",
    );

    const result = runVisualsCheck([fixtureDirectory]);

    expect(result.status).toBe(1);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain("wood.png");
    expect(output).toContain("extra.css");
  });

  it("fails with a non-zero exit when the directory does not exist (F-014 R-013)", () => {
    const fixtureDirectory = createFixtureDirectory();
    const missingDirectory = path.join(fixtureDirectory, "not-built");

    const result = runVisualsCheck([missingDirectory]);

    expect(result.status).not.toBe(0);
    expect(result.status).not.toBeNull();
  });
});

describe("check-local-visuals wiring (F-014 R-013)", () => {
  it("is the check:visuals npm script, run on dist/ (F-014 R-013)", () => {
    const packageManifest = JSON.parse(
      readFileSync(path.join(projectRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageManifest.scripts?.["check:visuals"]).toBe(
      "node scripts/check-local-visuals.mjs dist",
    );
  });

  it("runs in CI after the production build (F-014 R-013)", () => {
    const workflowLines = readFileSync(
      path.join(projectRoot, ".github", "workflows", "ci.yml"),
      "utf8",
    ).split("\n");
    const buildLineIndex = workflowLines.findIndex((line) =>
      /run:\s*npm run build\s*$/.test(line),
    );
    const visualsLineIndex = workflowLines.findIndex((line) =>
      /run:\s*npm run check:visuals\s*$/.test(line),
    );

    expect(buildLineIndex).toBeGreaterThanOrEqual(0);
    expect(visualsLineIndex).toBeGreaterThan(buildLineIndex);
  });
});
