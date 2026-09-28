// F-013 R-014: exercises the post-deploy smoke test (tests/smoke/smoke.spec.ts
// through playwright.smoke.config.ts) against a local build with a known
// BUILD_ID, served by a tiny static server started here.
//
// Opt-in: this suite builds the app and launches a browser, so it only runs
// with RUN_SMOKE_HARNESS=1. CI sets that once, in a single job, so the normal
// unit run and the pre-push hook stay fast.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const HARNESS_BUILD_ID = "harness-123";
const STALE_BUILD_ID = "stale";
const HARNESS_TIMEOUT_MILLISECONDS = 300_000;
const DELAYED_STALE_MILLISECONDS = 35_000;

const contentTypesByExtension: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

interface StaticServerOptions {
  outDirectory: string;
  // How long HTML is served with a stale build id, counted from the first
  // HTML request so Playwright's start-up time does not eat into it.
  staleForMilliseconds: number;
  firstHtmlRequestMilliseconds?: number;
  // Serve only beneath this path, like GitHub Pages serves a project site
  // under /<repository>/ (Codex F-013 review C1). Other paths answer 404.
  pathPrefix?: string;
}

interface RunningServer {
  server: Server;
  url: string;
}

interface SmokeRunResult {
  exitCode: number | null;
  output: string;
}

function resolveRequestedFile(
  outDirectory: string,
  requestUrl: string,
): string | null {
  const requestPath = decodeURIComponent(
    new URL(requestUrl, "http://localhost").pathname,
  );
  const relativePath = requestPath.endsWith("/")
    ? `${requestPath}index.html`
    : requestPath;
  const filePath = path.join(outDirectory, path.normalize(relativePath));
  if (!filePath.startsWith(outDirectory)) {
    return null;
  }
  try {
    return statSync(filePath).isFile() ? filePath : null;
  } catch {
    return null;
  }
}

function replaceBuildIdWithStale(html: string): string {
  return html.replaceAll(
    `content="${HARNESS_BUILD_ID}"`,
    `content="${STALE_BUILD_ID}"`,
  );
}

function respondWithStaticFile(
  options: StaticServerOptions,
  request: IncomingMessage,
  response: ServerResponse,
): void {
  const prefix = options.pathPrefix ?? "/";
  const requestUrl = request.url ?? "/";
  const filePath = requestUrl.startsWith(prefix)
    ? resolveRequestedFile(
        options.outDirectory,
        `/${requestUrl.slice(prefix.length)}`,
      )
    : null;
  if (filePath === null) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
    return;
  }
  const extension = path.extname(filePath);
  const contentType =
    contentTypesByExtension[extension] ?? "application/octet-stream";
  let body: Buffer | string = readFileSync(filePath);
  if (extension === ".html") {
    options.firstHtmlRequestMilliseconds ??= Date.now();
    const isServingStale =
      Date.now() <
      options.firstHtmlRequestMilliseconds + options.staleForMilliseconds;
    if (isServingStale) {
      body = replaceBuildIdWithStale(body.toString("utf8"));
    }
  }
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  response.end(body);
}

async function startStaticServer(
  options: StaticServerOptions,
): Promise<RunningServer> {
  const server = createServer((request, response) => {
    respondWithStaticFile(options, request, response);
  });
  await new Promise<void>((resolveListening) => {
    server.listen(0, "127.0.0.1", resolveListening);
  });
  const { port } = server.address() as AddressInfo;
  return {
    server,
    url: `http://127.0.0.1:${String(port)}${options.pathPrefix ?? "/"}`,
  };
}

async function stopStaticServer(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolveClosed) => {
    server.close(() => {
      resolveClosed();
    });
  });
}

async function runSmokeTest(
  smokeUrl: string,
  expectedBuildId: string,
  pollSeconds: string | undefined,
): Promise<SmokeRunResult> {
  const smokeEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    SMOKE_URL: smokeUrl,
    EXPECTED_BUILD_ID: expectedBuildId,
  };
  if (pollSeconds === undefined) {
    delete smokeEnvironment["SMOKE_POLL_SECONDS"];
  } else {
    smokeEnvironment["SMOKE_POLL_SECONDS"] = pollSeconds;
  }
  // Asynchronous spawn: the static server runs in this process and must keep
  // answering while Playwright runs.
  const smokeProcess = spawn(
    "npx",
    ["playwright", "test", "-c", "playwright.smoke.config.ts"],
    { cwd: projectRoot, env: smokeEnvironment },
  );
  const outputChunks: string[] = [];
  smokeProcess.stdout.on("data", (chunk: Buffer) => {
    outputChunks.push(chunk.toString("utf8"));
  });
  smokeProcess.stderr.on("data", (chunk: Buffer) => {
    outputChunks.push(chunk.toString("utf8"));
  });
  const exitCode = await new Promise<number | null>((resolveExit) => {
    smokeProcess.on("close", resolveExit);
  });
  return { exitCode, output: outputChunks.join("") };
}

describe.skipIf(!process.env["RUN_SMOKE_HARNESS"])(
  "post-deploy smoke test against a local build (F-013 R-014)",
  () => {
    let outDirectory = "";
    let runningServer: RunningServer | null = null;

    beforeAll(() => {
      outDirectory = mkdtempSync(path.join(tmpdir(), "smoke-harness-"));
      const buildResult = spawnSync(
        "npx",
        ["vite", "build", "--outDir", outDirectory, "--emptyOutDir"],
        {
          cwd: projectRoot,
          env: { ...process.env, BUILD_ID: HARNESS_BUILD_ID },
          encoding: "utf8",
        },
      );
      if (buildResult.status !== 0) {
        throw new Error(
          `vite build failed:\n${buildResult.stdout}\n${buildResult.stderr}`,
        );
      }
    }, HARNESS_TIMEOUT_MILLISECONDS);

    afterEach(async () => {
      if (runningServer !== null) {
        await stopStaticServer(runningServer.server);
        runningServer = null;
      }
    });

    afterAll(() => {
      if (outDirectory !== "") {
        rmSync(outDirectory, { recursive: true, force: true });
      }
    });

    it(
      "passes when the site is served only beneath a project path, as on GitHub Pages (Codex C1)",
      async () => {
        runningServer = await startStaticServer({
          outDirectory,
          staleForMilliseconds: 0,
          pathPrefix: "/factory-tictactoe/",
        });

        const smokeRun = await runSmokeTest(
          runningServer.url,
          HARNESS_BUILD_ID,
          "10",
        );

        expect(smokeRun.exitCode, smokeRun.output).toBe(0);
      },
      HARNESS_TIMEOUT_MILLISECONDS,
    );

    it(
      "passes when the served build id matches EXPECTED_BUILD_ID",
      async () => {
        runningServer = await startStaticServer({
          outDirectory,
          staleForMilliseconds: 0,
        });

        const smokeRun = await runSmokeTest(
          runningServer.url,
          HARNESS_BUILD_ID,
          undefined,
        );

        expect(smokeRun.exitCode, smokeRun.output).toBe(0);
      },
      HARNESS_TIMEOUT_MILLISECONDS,
    );

    it(
      "fails, naming the expected and last seen id, when the build id never matches within SMOKE_POLL_SECONDS",
      async () => {
        runningServer = await startStaticServer({
          outDirectory,
          staleForMilliseconds: 0,
        });

        const smokeRun = await runSmokeTest(
          runningServer.url,
          "not-the-deployed-build",
          "5",
        );

        expect(smokeRun.exitCode, smokeRun.output).not.toBe(0);
        expect(smokeRun.output).toContain("not-the-deployed-build");
        expect(smokeRun.output).toContain(HARNESS_BUILD_ID);
      },
      HARNESS_TIMEOUT_MILLISECONDS,
    );

    it(
      "passes when the expected build id only appears after 35 s, beyond Playwright's 30 s default timeout",
      async () => {
        runningServer = await startStaticServer({
          outDirectory,
          staleForMilliseconds: DELAYED_STALE_MILLISECONDS,
        });

        const smokeRun = await runSmokeTest(
          runningServer.url,
          HARNESS_BUILD_ID,
          undefined,
        );

        expect(smokeRun.exitCode, smokeRun.output).toBe(0);
      },
      HARNESS_TIMEOUT_MILLISECONDS,
    );
  },
);
