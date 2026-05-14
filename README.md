# josh-pi-subagents

Minimalist subagent delegation for the [pi](https://pi.dev) coding agent. Offload work to specialized, short-lived agents with isolated context windows.

## Philosophy

- **Short-lived**: Spawn, do one thing, return summary, exit
- **BYOA**: Bring Your Own Agent — define agents as `.md` files with YAML frontmatter
- **Clean context**: Only the final summary returns to the parent (not full conversation history)
- **Simple**: Single-agent delegation, no chains or parallel execution (by design)

## Installation

```bash
pi install npm:josh-pi-subagents
# or
pi install git:github.com/josh/josh-pi-subagents
```

## Quick Start

### 1. Create an Agent

Create `~/.pi/agent/agents/researcher.md`:

```markdown
---
name: researcher
description: Research specialist for finding code and documentation
model: claude-haiku-4-5
tools: read, grep, find, web_search
---

You are a research specialist. Investigate thoroughly and return concise findings.

**Critical**: Return only structured results, not conversation.

## Summary
Direct answer (2-3 sentences)

## Details (if needed)
- Point 1
- Point 2

## Sources (if relevant)
- `path/to/file.ts` - relevant context
```

### 2. Use It

```
Use researcher to find all authentication code in this codebase
```

## Agent Definition Format

Agents are markdown files with YAML frontmatter:

```markdown
---
name: my-agent              # Required: unique name
description: What it does   # Required: short description
model: claude-haiku-4-5     # Optional: model to use
tools: read, grep, find     # Optional: allowed tools
---

System prompt for the agent goes here.
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Unique agent identifier |
| `description` | ✅ | Short description for the LLM |
| `model` | ❌ | Model to use (defaults to parent's model) |
| `tools` | ❌ | Comma-separated list of allowed tools |

### Agent Locations

- `~/.pi/agent/agents/*.md` — User-level agents (always available)
- `.pi/agents/*.md` — Project-level agents (when `agentScope: "project"` or `"both"`)

## Usage

### Single Agent

```
Use researcher to find the database schema
Use reviewer to review src/auth.ts
Use worker to implement the plan from our discussion
```

### With Custom Working Directory

```
Use researcher to explore the api/ directory
```

(The agent inherits the current working directory by default.)

## Sample Agents

This package includes sample agents in the `agents/` directory:

- `researcher.md` — Fast reconnaissance, returns compressed findings
- `reviewer.md` — Code review specialist
- `worker.md` — General-purpose implementation

Copy them to get started:

```bash
mkdir -p ~/.pi/agent/agents
cp $(pi package path josh-pi-subagents)/agents/*.md ~/.pi/agent/agents/
```

## How It Works

1. **Discovery**: Scans `~/.pi/agent/agents/` for `.md` files with YAML frontmatter
2. **Delegation**: When you say "Use X to...", the `delegate` tool spawns a subagent
3. **Isolation**: Each subagent runs as `pi --mode json -p --no-session` with its own context
4. **Execution**: Subagent receives its system prompt + your task
5. **Return**: Only the final assistant message returns to the parent session

## Why No Chains or Parallel Execution?

This package intentionally omits:
- **Chain mode**: The parent agent can sequence multiple `delegate` calls explicitly
- **Parallel mode**: Can be added later if needed; sequential is easier to reason about

The goal is predictable, debuggable delegation. If you need complex orchestration, the parent agent should drive it.

## Comparison to Other Subagent Packages

| Feature | josh-pi-subagents | @mjakl/pi-subagent | pi-subagents |
|---------|-------------------|-------------------|--------------|
| **Philosophy** | Minimalist, explicit | Minimalist | Feature-rich |
| **Chains** | ❌ No | ❌ No | ✅ Yes |
| **Parallel** | ❌ No | ✅ Yes | ✅ Yes |
| **Fork mode** | ❌ No | ✅ Yes | ❌ No |
| **Agent format** | `.md` with YAML | Code/config | Code/config |
| **UI complexity** | Simple text | Moderate | Rich widgets |

## Development

```bash
git clone https://github.com/josh/josh-pi-subagents
cd josh-pi-subagents
pi install ./
```

Edit agents in `~/.pi/agent/agents/` and test immediately — agents are discovered fresh on each invocation.

## License

MIT
