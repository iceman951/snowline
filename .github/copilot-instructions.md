# GitHub Copilot Instructions

## Commit Messages

Apply these guidelines whenever asked to generate a commit message or create a commit. Use Conventional Commits and write concise, specific messages in English that accurately describe the changes.

### Format

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

Square brackets indicate optional fields; do not include the brackets in the message. Use `!` only to mark a breaking change.

### Commit Types

Choose the type that best describes the primary purpose of the change. Prefer a specific type over `chore` when one applies.

| Type | Use for |
| --- | --- |
| `feat` | Adding a new feature or capability. |
| `fix` | Correcting a bug or unintended behavior. |
| `enhance` | Improving an existing capability without adding a new feature or fixing a bug. This is a project-specific type. |
| `chore` | Routine maintenance, such as dependency updates, that does not fit a more specific type. |
| `docs` | Updating documentation, such as README files, guides, or explanatory code comments. |
| `style` | Formatting-only changes, such as whitespace or semicolons, with no behavior changes. |
| `refactor` | Restructuring code without changing its behavior. |
| `perf` | Improving performance, such as reducing loading time or memory usage. |
| `test` | Adding, updating, or correcting tests. |
| `build` | Changing build tools, build configuration, or packaging. |
| `ci` | Changing CI/CD workflows, pipeline configuration, or automation scripts. |

Use `perf` for performance improvements rather than `enhance`. Use `refactor` or `style` for their respective changes rather than `chore`, and use `ci` for pipeline changes rather than `build`.

### Writing Guidelines

- Use the imperative mood: `add`, `fix`, or `improve`, rather than `added`, `fixed`, or `improves`.
- Start the description with a lowercase word and omit a trailing period.
- Keep the subject line focused on the main change. Avoid vague descriptions such as `update code` or `misc fixes`.
- Include an optional scope when it adds useful context, such as `auth`, `api`, or `docs`.
- Add a body only when needed to explain the motivation, relevant context, or impact. Separate it from the subject with a blank line.
- Reference a related issue in a footer, such as `Refs: #123`. Use `Closes #123` only when the commit resolves the issue.
- For a breaking change, add `!` before the colon and explain the incompatibility and any required migration in a `BREAKING CHANGE:` footer.
- Base the message on the actual changes. Do not invent issue numbers, outcomes, or implementation details.

### Examples

- `feat(auth): add OAuth support`
- `fix: resolve login timeout issue`
- `enhance: improve validation error messages`
- `chore: update development dependencies`
- `docs: update installation guide`
- `style: normalize indentation`
- `refactor: simplify user service logic`
- `perf: reduce dashboard loading time`
- `test: cover expired sessions`
- `build: configure production bundling`
- `ci: run tests on pull requests`

A message with an issue reference:

```text
fix(auth): handle expired sessions

Redirect users to the login page when their session expires.

Closes #123
```

A message describing a breaking change:

```text
feat(api)!: require pagination for list endpoints

BREAKING CHANGE: List endpoints now return paginated results. Update clients to read the items field and follow pagination links.
```
