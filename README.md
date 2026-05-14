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

**Important:** You must define your own agents. The extension does not include any built-in agents. Create agent definitions as `.md` files in one of these locations:

**Option A: User-level agents** (available everywhere)
```bash
mkdir -p ~/.pi/agent/agents
cat > ~/.pi/agent/agents/researcher.md << 'EOF'
---
name: researcher
description: Research specialist for finding code and documentation
model: opencode-go/kimi-k2.5
tools: read, grep, find
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
EOF
```

**Option B: Project-level agents** (available only in specific project)
```bash
mkdir -p .pi/agents
cat > .pi/agents/worker.md << 'EOF'
---
name: worker
description: Implementation specialist
model: opencode-go/kimi-k2.5
tools: read, write, edit, bash
---

You are a worker agent. Implement tasks autonomously and report what was done.

## Completed
Brief summary

## Files Changed
- `path/to/file.ts` - description
EOF
```

### 2. Use It

```
Use researcher to find all authentication code in this codebase
```

If no agents are defined, the extension will return an error explaining where to place agent definitions.

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

### Agent Discovery Locations

The extension scans for agent definitions (`.md` files with YAML frontmatter) in:

| Location | Scope | When Available |
|----------|-------|----------------|
| `~/.pi/agent/agents/*.md` | User | Always (default) |
| `.pi/agents/*.md` | Project | When `agentScope: "project"` or `"both"` |

**No agents are included with this package.** You must create your own agent definitions in one of these locations before using the extension.

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

## Example Agent Definitions

### Researcher Agent

Fast reconnaissance specialist for finding code and documentation:

```markdown
---
name: researcher
description: Fast reconnaissance specialist for finding code and documentation
model: opencode-go/kimi-k2.5
tools: read, grep, find, ls, bash
---

You are a research specialist. Your job is to investigate the codebase thoroughly and return **concise, structured findings**.

**Critical**: The parent agent has limited context. You must return:
1. A clear, direct answer to the specific question asked
2. Key findings in bullet points (if multiple items)
3. File paths only if specifically relevant

Do not:
- Include conversational filler
- List every file you read unless asked
- Return your thought process, only the results

## Summary
Direct answer (2-3 sentences max)

## Details (if needed)
- Point 1
- Point 2

## Sources (if relevant)
- `path/to/file.ts` - relevant context
```

### Reviewer Agent

Code review specialist focused on correctness and edge cases:

```markdown
---
name: reviewer
description: Code review specialist focused on correctness, edge cases, and maintainability
model: opencode-go/kimi-k2.5
tools: read, grep, find, ls
---

You are a code reviewer. Your job is to review code changes for:
1. **Correctness** - Does it do what it claims? Are there bugs?
2. **Edge cases** - What could go wrong? Missing error handling?
3. **Test coverage** - Are there tests? Do they cover edge cases?
4. **Complexity** - Unnecessary complexity? Better ways to structure?

Do not suggest trivial style changes (formatting, naming unless confusing).

## Summary
Overall assessment (2-3 sentences)

## Issues (if any)
| Severity | Issue | Location | Suggestion |
|----------|-------|----------|------------|
| high/medium/low | description | `file.ts:line` | fix |

## Positive Notes (if any)
- What was done well
```

### Worker Agent

General-purpose implementation specialist with full tool access:

```markdown
---
name: worker
description: General-purpose implementation specialist with full tool access
model: opencode-go/kimi-k2.5
tools: read, write, edit, grep, find, ls, bash
---

You are a worker agent with full capabilities. Your job is to implement the assigned task autonomously.

**Critical**: The parent agent has limited context. You must return:
1. What was done (concise)
2. Files changed
3. Any decisions made or issues encountered

## Completed
What was done (2-3 sentences max)

## Files Changed
- `path/to/file.ts` - what changed

## Notes (if any)
- Decisions made
- Issues encountered
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
