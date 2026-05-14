# josh-pi-subagents

Minimalist subagent delegation for the [pi](https://pi.dev) coding agent. Offload work to specialized, short-lived agents with isolated context windows.

## Philosophy

- **Short-lived**: Spawn, do one thing, return summary, exit
- **BYOA**: Bring Your Own Agent — define agents as `.md` files with YAML frontmatter
- **Clean context**: Only the final summary returns to the parent (not full conversation history)
- **Simple**: Single-agent delegation, no chains or parallel execution (by design)
- **Context-aware**: Agent names and descriptions are injected into the system prompt so the LLM knows what's available before deciding whether to delegate

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

**Option B: Project-level agents** (available in that project)
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

The LLM sees the full agent roster in its system prompt (name, source, and description for each agent), so it can choose the right agent without a discovery round-trip.

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
| `description` | ✅ | Short description shown to the LLM in the system prompt |
| `model` | ❌ | Model to use (defaults to parent's model) |
| `tools` | ❌ | Comma-separated list of allowed tools |
| `taskTemplate` | ❌ | Task framing template; `{task}` is replaced with the delegation text. Falls back to `Task: {task}` if omitted. |

### Task Templates

By default, the subagent receives the delegation as `Task: <whatever the parent LLM decided>`. The `taskTemplate` field lets you control how the task is framed for that specific agent.

The `{task}` placeholder is replaced with the task text from the parent. If you omit `taskTemplate`, the default `Task: {task}` is used. If the template doesn't contain `{task}`, the task text is ignored and the template is used verbatim (useful for fixed-prompt agents).

```markdown
---
name: researcher
description: Research specialist
taskTemplate: |
  Research request: {task}

  Classify and investigate. Return Facts, Inference, Evidence, and Likely next step.
---
```

This means the parent model's task — which might be vague like "look at auth" — becomes:

```
Research request: look at auth

Classify and investigate. Return Facts, Inference, Evidence, and Likely next step.
```

The primary model doesn't need to know about the template. It just passes a task; the agent definition handles the framing.

### Agent Discovery Locations

The extension scans for agent definitions (`.md` files with YAML frontmatter) in both locations — all discovered agents are always available:

| Location | Scope | Always Available |
|----------|-------|-----------------|
| `~/.pi/agent/agents/*.md` | User | ✅ Yes |
| `.pi/agents/*.md` | Project | ✅ Yes |

There is no scope parameter. All agents from both locations are loaded and injected into the system prompt. Project-level agents are discovered by walking up from the current working directory.

**No agents are included with this package.** You must create your own agent definitions before using the extension.

## How It Works

1. **Cache on startup**: Scans both `~/.pi/agent/agents/` and `.pi/agents/` and caches the agent list
2. **Inject roster**: Before each LLM call, injects the agent roster (names + descriptions) into the system prompt so the LLM can see available agents without calling a tool first
3. **Delegation**: When you say "Use X to...", the `delegate` tool spawns a subagent
4. **Isolation**: Each subagent runs as `pi --mode json -p --no-session` with its own context
5. **Execution**: Subagent receives its system prompt + your task (framed by the agent's `taskTemplate` if defined, otherwise `Task: ...`)
6. **Return**: Only the final assistant message returns to the parent session

The cache is refreshed on `/reload` and on session start.

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
taskTemplate: |
  Research request: {task}

  Investigate thoroughly and return structured findings.
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
taskTemplate: |
  Review request: {task}

  Assess correctness, edge cases, and maintainability. Report findings in the structured format below.
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
taskTemplate: |
  Implementation task: {task}

  Implement autonomously and report what was done, files changed, and any decisions or issues.
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

Edit agents in `~/.pi/agent/agents/` and test immediately — agents are reloaded on `/reload` or when a new session starts.

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

#### Test Roster Injection
```bash
# Start interactive mode and check the system prompt includes agent names
pi -e ./index.ts
# Then ask: "What agents are available?"
# The LLM should list all agents by name without calling any tool
```

#### Test Error Handling
```bash
# Unknown agent
pi -p -e ./index.ts "Use fake-agent to do work"
```

#### Hot Reload During Development
```bash
# Place extension in auto-discovery path for /reload support
mkdir -p ~/.pi/agent/extensions/
ln -s $(pwd) ~/.pi/agent/extensions/josh-pi-subagents

# Run pi normally (loads extension automatically)
pi

# After editing agents or extension files, reload without restarting pi:
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