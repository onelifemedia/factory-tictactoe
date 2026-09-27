# Engineering standards

Every change follows these rules — human or agent, feature or hotfix. The git
hooks and CI enforce what a machine can check; code review enforces the rest.
`bash <factory>/scripts/standards.sh check` verifies the setup, and the
implementation gate will not pass while it reports findings.

## 1. Naming

Names are the documentation that is always read. Be pedantic: a review finding
about a name is never "just style".

### 1.1 Whole words, no abbreviations

- Spell words out: `request` not `req`, `response` not `res`, `error` not `err`/`e`,
  `callback` not `cb`, `context` not `ctx`, `index` not `idx`/`i`, `element` not `el`,
  `button` not `btn`, `message` not `msg`, `number` not `num`, `count` not `cnt`,
  `configuration` not `cfg`/`conf`, `database` not `db`, `temporary` not `tmp`/`temp`.
- No single-letter names anywhere, including loop counters, lambda parameters,
  `catch` variables and type parameters: `for (const invoice of invoices)`,
  `catch (error)`, `<Item>` not `<T>`.
- Minimum length is **3 characters**. The only shorter names allowed are `id`,
  `ui`, and `_` for a deliberately unused value.
- Acronyms are allowed only when the acronym _is_ the everyday word: `id`, `url`,
  `api`, `html`, `css`, `json`, `http`, `sql`, `uuid`, `ui`. Treat them as words
  in camelCase and PascalCase: `userId`, `HttpClient`, `parseJson` (Go keeps its
  own `userID` convention).

### 1.2 Say what it is, not what type it has

- Banned vague names: `data`, `info`, `temp`, `tmp`, `obj`, `val`, `thing`,
  `stuff`, `foo`, `bar`, `baz`, `qux`, `dummy`, `misc`. Name the domain concept
  instead: `invoice`, `unpaidInvoices`, `invoiceTotalCents`.
- No type encoding: no `strName`, `arrUsers`, `userList` for an array, no `I`
  prefix on interfaces, no `Impl` suffix on the only implementation.
- Use the PRD's domain terms verbatim, and one word per concept across the
  codebase: if it is a `customer` in the PRD it is never a `client` or `user` in
  the code, and if loading is `fetch` it is never also `get`/`retrieve`/`load`.

### 1.3 Shape follows role

| Role                     | Rule                                                                     | Good                                        | Bad                                 |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------- |
| Function / method        | Verb phrase naming the effect                                            | `calculateInvoiceTotal`, `sendReceiptEmail` | `invoice`, `process`, `doWork`      |
| Generic verbs            | `handle`, `process`, `manage`, `run`, `do` need a specific object        | `handleCheckoutSubmit`                      | `handleClick`, `processData`        |
| Boolean                  | Reads as a yes/no question: `is`/`has`/`can`/`should`/`was`/`did`/`will` | `isExpired`, `hasUnpaidInvoices`            | `expired`, `flag`, `status`         |
| Negation                 | Never name the negative                                                  | `isValid` / `isInvalid`                     | `isNotValid`, `notDisabled`         |
| Collection               | Plural noun                                                              | `invoices`, `lineItems`                     | `invoiceList`, `items2`             |
| Map / dictionary         | `<values>By<Key>`                                                        | `invoicesByCustomerId`                      | `invoiceMap`, `lookup`              |
| Quantity with a unit     | Unit in the name unless the type carries it                              | `timeoutMilliseconds`, `priceCents`         | `timeout`, `price`                  |
| Count                    | `<noun>Count`                                                            | `retryCount`                                | `retries` (ambiguous), `n`          |
| Type / class / component | Noun, PascalCase                                                         | `InvoiceSummary`                            | `InvoiceSummaryData`, `Helper`      |
| Constant                 | Language convention, still whole words                                   | `MAXIMUM_RETRY_COUNT`                       | `MAX_RETRIES_N`                     |
| Test                     | A sentence describing the behavior, with feature/requirement IDs         | `rejects an expired card (F-004 R-012)`     | `test1`, `works`                    |
| File / module            | Named after its main export, language case convention                    | `invoice-summary.ts`                        | `utils.ts`, `helpers.py`, `misc.go` |

### 1.4 Case

| Language                | Variables, functions | Types, classes, components | Constants                              | Files            |
| ----------------------- | -------------------- | -------------------------- | -------------------------------------- | ---------------- |
| TypeScript / JavaScript | `strictCamelCase`    | `StrictPascalCase`         | `UPPER_SNAKE_CASE` (module level only) | `kebab-case`     |
| Python                  | `snake_case`         | `PascalCase`               | `UPPER_SNAKE_CASE`                     | `snake_case.py`  |
| Swift                   | `lowerCamelCase`     | `UpperCamelCase`           | `lowerCamelCase`                       | `TypeName.swift` |
| Go                      | `mixedCaps`          | `MixedCaps`                | `MixedCaps`                            | `snake_case.go`  |
| Rust                    | `snake_case`         | `UpperCamelCase`           | `UPPER_SNAKE_CASE`                     | `snake_case.rs`  |

### 1.5 Exceptions

A name required by a framework or an external contract (a JSON field from a
third-party API, a React `props` parameter, a database column you do not own)
is allowed at that boundary only. Map it to a compliant name immediately, and
add it to the linter's allow list with a comment naming the reason. Never
disable a naming rule for a whole file.

## 2. Git hooks

Hooks live in `.githooks/`, are committed, and are activated with
`git config core.hooksPath .githooks` (the factory does this; new clones run it
once, or it runs from the package manager's `prepare`/setup script).

- **pre-commit:** format check (fast; keeps every commit formatted).
- **pre-push:** format check, lint (including the naming rules), type check,
  full test suite.

Never bypass them with `--no-verify`. If a hook is wrong, fix the hook. CI runs
the same commands, so a skipped hook is caught anyway.

## 3. Formatting and linting

- One formatter, run by the check command, with no per-file overrides. Formatter
  and linter skip `.factory/` (factory artifacts, not source code).
- The linter runs with warnings treated as errors; no inline disables without
  a comment explaining why and naming the ticket or ADR.
- The commands live in `.factory/config.json` → `standards.commands`
  (`format_check`, `lint`, `typecheck`, `test`) and are the only way to run
  those checks, for hooks, CI and humans alike.

## 4. Commits and branches

- One pull request per feature, from `factory/F-nnn-short-slug`, titled
  `F-nnn: <title>`. Features stack in plan order: each branch starts from the
  newest unmerged feature below it, and is rebased onto the main branch once
  that merges. Small pull requests are what keep review fast.
- Conventional Commits with the feature ID: `test(F-004): …`, `feat(F-004): …`,
  `refactor(F-004): …`, `docs(F-004): …`, `ci: …`, `chore: …`.
- Every commit leaves the suite green except the deliberate red `test(…)` commit.

## 5. Secrets and configuration

- No secrets in the repository. `.env` is git-ignored; `.env.example` lists
  every key with a placeholder.
- Configuration comes from the environment, validated at startup, with a clear
  error naming the missing key.

## 6. Enforcement recipes

`standards.sh check` looks for these rules in the listed files. Use the recipe
for the project's language; for anything else, configure the closest
equivalent and record it in an ADR named by `standards.naming.waiver`.

### TypeScript / JavaScript — `eslint.config.js`

Needs `eslint`, `@eslint/js`, `typescript-eslint`, and `eslint-plugin-unicorn` (76 or later;
earlier versions call `name-replacements` `prevent-abbreviations`).

```js
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
      "unicorn/name-replacements": ["error", { checkFilenames: true }],
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
```

Framework components that must be PascalCase (React, Svelte) get a
`{ selector: "function", format: ["strictCamelCase", "StrictPascalCase"] }` entry.

### Python — `pyproject.toml`

Ruff for formatting and PEP 8 naming; pylint only for the naming checks ruff
lacks (`pylint --disable=all --enable=invalid-name,disallowed-name <paths>` in
the lint command).

pylint is GPL-2.0-or-later and its dependency astroid is LGPL-2.1-or-later.
A virtual environment does not say which packages are development-only, so the
license audit asks about both. They are linters that never ship with the
product; record that decision once in `governance.license_exceptions`.

```toml
[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "B", "UP", "SIM"]

[tool.pylint.basic]
bad-names = ["data", "info", "temp", "tmp", "obj", "val", "thing", "stuff",
             "foo", "bar", "baz", "qux", "dummy", "misc"]
good-names = ["id", "_"]
variable-rgx = "^(?=[a-z0-9_]{3,}$)[a-z][a-z0-9]*(_[a-z0-9]+)*$"
argument-rgx = "^(?=[a-z0-9_]{3,}$)[a-z][a-z0-9]*(_[a-z0-9]+)*$"
attr-rgx = "^(?=_?[a-z0-9_]{3,}$)_?[a-z][a-z0-9]*(_[a-z0-9]+)*$"
function-rgx = "^(?=_?[a-z0-9_]{3,}$)_?[a-z][a-z0-9]*(_[a-z0-9]+)*$"
```

### Swift — `.swiftlint.yml`

```yaml
identifier_name:
  min_length: { error: 3 }
  excluded: [id, ui]
  validates_start_with_lowercase: error
type_name:
  min_length: { error: 3 }
  max_length: { warning: 50, error: 60 }
```

### Go — `.golangci.yml`

Go's community style favors very short names; this standard deliberately does
not. `err`, `ok`, and `id` are the only allowed short names.

```yaml
version: "2"
linters:
  enable: [revive, varnamelen]
  settings:
    varnamelen:
      min-name-length: 3
      ignore-names: [err, ok, id]
      check-receiver: true
      check-return: true
      check-type-param: true
    revive:
      rules:
        - name: var-naming
```

### Rust — `clippy.toml` plus `Cargo.toml`

```toml
# clippy.toml
min-ident-chars-threshold = 2  # inclusive: lints names of 1-2 characters
allowed-idents-below-min-chars = ["id", "ui", "_"]
disallowed-names = ["data", "info", "temp", "tmp", "obj", "val", "thing", "stuff",
                    "foo", "bar", "baz", "qux", "dummy", "misc"]

# Cargo.toml
[lints.clippy]
min_ident_chars = "deny"
disallowed_names = "deny"
```

What no linter can check (verb phrases, units, one word per concept, names that
lie) is the code reviewer's job; every such finding is at least MEDIUM, and a
name that misleads about behavior is HIGH.
