// F-001 follow-up: the naming recipe keeps whole words and still rejects abbreviations.
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const projectRoot = new URL("../..", import.meta.url).pathname;

async function lintSnippet(sourceText: string): Promise<string[]> {
  const linter = new ESLint({ cwd: projectRoot });
  // The type-aware project service only parses paths it knows, so the snippet
  // is linted as if it were an existing source file; nothing is written to disk.
  const [result] = await linter.lintText(sourceText, {
    filePath: `${projectRoot}src/main.ts`,
  });
  return (result?.messages ?? []).map((message) => message.ruleId ?? "");
}

describe("naming rules (F-001 follow-up, standards §6)", () => {
  it.each(["repository", "configuration", "application", "applications"])(
    "accepts the whole word %s",
    async (word) => {
      const ruleIds = await lintSnippet(`export const ${word}Count = 1;\n`);
      expect(ruleIds).not.toContain("unicorn/name-replacements");
    },
  );

  it("still rejects abbreviations such as btn", async () => {
    const ruleIds = await lintSnippet("export const btnCount = 1;\n");
    expect(ruleIds).toContain("unicorn/name-replacements");
  });
});
