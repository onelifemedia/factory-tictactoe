import { defineConfig, type Plugin } from "vite";

// F-013 (R-014): the deployed commit is visible in the page, so the post-deploy
// smoke test can wait for the new build instead of testing the old one.
function createBuildIdPlugin(): Plugin {
  const buildId = process.env["BUILD_ID"] ?? "local";
  return {
    name: "inject-build-id",
    transformIndexHtml(html) {
      return html.replace(
        "</head>",
        `  <meta name="build-id" content="${buildId.replace(/[^\w.-]/g, "")}">\n  </head>`,
      );
    },
  };
}

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
  },
  plugins: [createBuildIdPlugin()],
});
