# MCP

Use the Buzzy MCP server whenever work involves Buzzy app definitions, data models, screens, workflows, roles, privacy controls, or Buzzy deployment settings.

Before any write action through Buzzy MCP, inspect the current app definition first. Preserve the existing `userfx-web` application and repository structure unless the task explicitly asks for a migration or replacement. Prefer the smallest scoped change that satisfies the request.

## USER FX TSX / JSX formatting (required)

Use the repository owner's source-format example as the canonical style for every new or edited `.tsx` file. Keep it visually compact and easy to scan in VS Code:

- Use vertical JSX: one element per line, with opening/closing tags written on their own lines.
- Keep JSX attributes on the opening tag's **same line** whenever possible, including `className`, `variants`, `onClick`, `animate`, and `transition`. Avoid automatic prop wrapping.
- Prefer flat/shallow JSX indentation (nested tags aligned near their parent), as in the owner's `return (` / `<footer>` sample. Do not insert progressively deep whitespace just because elements are nested.
- Keep JSX text and expressions on separate lines inside their wrapper tags when present (for example, a `{line}` expression inside a `motion.span`).
- Avoid unnecessary blank lines between JSX siblings or nested tags.
- Keep `map` callbacks, conditionals, event handlers, and animation props semantically identical: formatting must not modify runtime behavior.
- These rules concern **source presentation**, not rendered UI styles or DOM structure.
- Do not run whole-repository Prettier over TSX; Prettier's default output does not preserve this owner's preferred JSX layout. For broad retroactive restyling, review the changes before merging.
