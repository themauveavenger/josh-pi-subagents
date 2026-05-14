# Josh Pi Subagents

## Non-discoverable commands

- **Run tests:** `node --test lib/*.test.ts` (no test framework — uses Node built-in test runner with TypeScript via type stripping)
- **Typecheck:** `npx tsc --noEmit` (project is type-stripped, never compiled)
- **`mise.toml`** pins Node 26. If not using mise, ensure Node ≥26 is active.

## Landmines

- **Import extensions in test files:** Use `.ts` extensions in test imports (e.g., `import { … } from "./parser.ts"`), not `.js`. The project uses `verbatimModuleSyntax` + `NodeNext` — `.js` imports will fail at runtime even though TypeScript resolves them.
- **Duplicate agent names:** When a user-level and project-level agent share the same name, the project-level one wins (last-write-wins via `Map.set` iteration order in `discoverAgents`).
- **Project agent discovery walks up from CWD:** `findNearestProjectAgentsDir` ascends from the working directory to find `.pi/agents/`. Test mocks must account for this upward traversal.
- **`typebox` is a devDependency but used at runtime:** `DelegateParams` is built with TypeBox in `index.ts`. This works because pi extensions run from source, but don't move it to a separate production-only concern.
- **`getPiInvocation` heuristic:** The function tries to determine whether to re-invoke the current script or fall back to `pi`. If running under Bun's virtual filesystem (`/$bunfs/root/`), it falls back to the `pi` command. Changing the runtime or entry point may break this.
