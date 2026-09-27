import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";

const vagueNames = [
  "data",
  "info",
  "temp",
  "tmp",
  "obj",
  "val",
  "thing",
  "stuff",
  "foo",
  "bar",
  "baz",
  "qux",
  "dummy",
  "misc",
];

export default tseslint.config(
  {
    ignores: [
      "dist/",
      ".factory/",
      "playwright-report/",
      "test-results/",
      "node_modules/",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true } },
    plugins: { unicorn },
    rules: {
      "id-length": [
        "error",
        { min: 3, exceptions: ["id", "ui", "_"], properties: "never" },
      ],
      "id-denylist": ["error", ...vagueNames],
      // unicorn 76's defaults also *shorten* four whole words (repository -> repo,
      // configuration -> config, application(s) -> app(s)); switch those off.
      "unicorn/name-replacements": [
        "error",
        {
          checkFilenames: true,
          replacements: {
            application: false,
            applications: false,
            configuration: false,
            repository: false,
          },
        },
      ],
      "unicorn/consistent-boolean-name": "error",
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["strictCamelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "variable",
          modifiers: ["const", "global"],
          format: ["strictCamelCase", "UPPER_CASE"],
        },
        { selector: "typeLike", format: ["StrictPascalCase"] },
        {
          selector: "interface",
          format: ["StrictPascalCase"],
          custom: { regex: "^I[A-Z]", match: false },
        },
        {
          selector: "variable",
          types: ["boolean"],
          format: ["StrictPascalCase"],
          prefix: ["is", "has", "can", "should", "was", "did", "will"],
        },
        { selector: ["objectLiteralProperty", "import"], format: null },
      ],
    },
  },
);
