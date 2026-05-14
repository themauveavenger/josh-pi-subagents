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

## Development

```bash
git clone https://github.com/josh/josh-pi-subagents
cd josh-pi-subagents
pi install ./
```

Edit agents in `~/.pi/agent/agents/` and test immediately — agents are discovered fresh on each invocation.

### Manual Testing

#### Quick Load Test (Interactive Mode)
```bash
# Load extension and enter interactive mode
pi -e ./index.ts
```
Then type in the pi prompt:
```
Use researcher to find all TODO comments in this codebase
```

#### Print Mode (Non-interactive, Best for Scripts)
```bash
# Single prompt, stdout output, no TUI
pi -p -e ./index.ts "Use researcher to list the files in the current directory"

# With specific working directory
pi -p -e ./index.ts --cwd /path/to/project "Use researcher to explore the src/ directory"

# JSON mode (structured output for programmatic use)
pi --mode json -p -e ./index.ts "Use researcher to find all markdown files"
```

#### Test Agent Discovery
```bash
# Verify agents are found with a test invocation
pi -p -e ./index.ts "Use nonexistent-agent to do something"
# Should return: "Unknown agent: \"nonexistent-agent\". Available: \"researcher\", \"reviewer\", \"worker\"."
```

#### Test Different Agent Scopes
```bash
# User scope only (default)
pi -p -e ./index.ts "Use researcher to find TODOs"

# Project scope (if you have .pi/agents/ in your project)
pi -p -e ./index.ts "Use my-project-agent to do something with agentScope: project"

# Both scopes
pi -p -e ./index.ts "Use researcher with agentScope: both to find TODOs"
```

#### Test Error Handling
```bash
# Unknown agent
pi -p -e ./index.ts "Use fake-agent to do work"

# Missing agent name
pi -p -e ./index.ts "delegate to do something"
```

#### Hot Reload During Development
```bash
# Place extension in auto-discovery path for /reload support
mkdir -p ~/.pi/agent/extensions/
ln -s $(pwd) ~/.pi/agent/extensions/josh-pi-subagents

# Run pi normally (loads extension automatically)
pi

# After editing files, reload without restarting pi:
/reload
```

#### Quick Test Checklist

| Test | Command | Expected Result |
|------|---------|-----------------|
| Extension loads | `pi -e ./index.ts` | No errors, extension active |
| Researcher works | `pi -p -e ./index.ts "Use researcher to find all .ts files"` | File list returned |
| Reviewer works | `pi -p -e ./index.ts "Use reviewer to review agents.ts"` | Review output |
| Worker works | `pi -p -e ./index.ts "Use worker to create a test file"` | File created, confirmation |
| Unknown agent | `pi -p -e ./index.ts "Use fake to work"` | Error with available list |

**Shell aliases for convenience:**
```bash
alias pi-test='pi -p -e ./index.ts'
alias pi-dev='pi -e ./index.ts'
```

## License

MIT
