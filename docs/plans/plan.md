# josh-pi-subagents Plan

## Goal
Create a minimalist pi extension for subagent delegation that:
1. Helps manage context windows by offloading work to specialized, short-lived subagents
2. Supports "bring your own agent" (BYOA) via `.md` files with YAML frontmatter
3. Returns only final summaries (not full conversation history) to keep parent context clean
4. Is packaged for easy installation on multiple computers

## Motivation
When planning complex tasks, I want to tell the primary agent:
- "Delegate research to a research-specific subagent"
- "Delegate code review to a reviewer subagent"

Each subagent should run in isolation, do one thing, return a concise summary, and exit.

## Research: Existing Options

### 1. @mjakl/pi-subagent (Minimalist)
- **Size**: 88KB, 0 dependencies
- **Features**: spawn/fork modes, parallel execution, depth/cycle guards
- **Agents**: BYOA - you define your own
- **Verdict**: Good, but wanted to understand pi's built-in example first

### 2. pi-subagents (nicobailon)
- Feature-rich with defaults, truncation, artifacts
- Too heavy for this use case

### 3. @tintinweb/pi-subagents
- Claude Code-style with widgets, mid-run steering
- Too feature-rich for minimalist needs

### 4. Pi's Built-in Subagent Example
- Ships with pi at `examples/extensions/subagent/`
- Clean architecture using subprocess isolation
- Uses `.md` agent definitions with YAML frontmatter (like OpenCode)
- **Decision**: Base our implementation on this

## Key Design Decisions

### 1. Subagent Lifespan
- **Short-lived and single-purpose**: Spawn, do one task, return summary, exit
- No chaining (each delegation is independent)
- No parallel execution in v1 (can add later)

### 2. Output Format
- Subagents return **only the final assistant message**
- Not the full conversation history
- Parent context stays clean

The built-in example already does this via `getFinalOutput()`:
```typescript
function getFinalOutput(messages: Message[]): string {
  // Returns only the last assistant message text
}
```

### 3. Agent Definitions
Use `.md` files with YAML frontmatter (like OpenCode):

```markdown
---
name: researcher
description: Research specialist
model: claude-haiku-4-5
tools: read, grep, find, web_search
---

You are a research specialist. Return concise findings.

## Summary
Direct answer (2-3 sentences)

## Details (if needed)
- Point 1
- Point 2
```

Agent discovery:
- `~/.pi/agent/agents/*.md` (user-level, always loaded)
- `.pi/agents/*.md` (project-level, opt-in via scope setting)

### 4. Context Isolation
Each subagent runs as a separate `pi` subprocess:
```bash
pi --mode json -p --no-session \
   --model <agent-model> \
   --tools <agent-tools> \
   --append-system-prompt <agent-prompt.md> \
   "Task: <task description>"
```

This gives true isolation - fresh context window for each subagent.

## Architecture

### Files
```
josh-pi-subagents/
├── index.ts              # Extension entry point, tool registration
├── agents.ts             # Agent discovery from .md files
├── package.json          # Pi package manifest + npm deps
├── README.md             # Installation and usage docs
└── agents/               # Sample agent definitions
    ├── researcher.md
    ├── reviewer.md
    └── worker.md
```

### Core Flow
1. **Discovery**: `agents.ts` scans for `.md` files, parses YAML frontmatter
2. **Delegation**: Parent calls `delegate` tool with `{ agent, task }`
3. **Spawn**: Extension spawns `pi` subprocess with isolated context
4. **Stream**: Parse JSON events from stdout (`message_end`, `tool_result_end`)
5. **Extract**: Get final assistant message via `getFinalOutput()`
6. **Return**: Send summary back to parent, subagent exits

### Tool Interface
```typescript
{
  name: "delegate",
  parameters: {
    agent: string;      // Name of agent to invoke
    task: string;       // Task description
    agentScope?: "user" | "project" | "both";  // Where to look for agents
  }
}
```

## Minimal Implementation (v1)

Strip the built-in example down to:
- ✅ Single agent mode only (no parallel/chain)
- ✅ `.md` agent discovery
- ✅ Simple text rendering (no complex UI)
- ✅ User-scope agents only (simpler security model)
- ❌ No parallel execution
- ❌ No chain mode
- ❌ No usage tracking display
- ❌ No project-agent confirmation prompts

Keep:
- Subprocess spawning with `--mode json -p --no-session`
- JSON event streaming/parsing
- `getFinalOutput()` for extracting final result
- Basic error handling

## Usage Examples

```
# Research task
Use researcher to find all authentication-related code in this codebase

# Code review
Use reviewer to review the changes in src/auth.ts

# General delegation  
Use worker to implement the plan we just discussed
```

## Future Enhancements (v2+)

1. **Parallel execution**: Run multiple subagents concurrently
2. **Chain mode**: Sequential with `{previous}` placeholder
3. **Context modes**: spawn (fresh) vs fork (inherit session)
4. **Usage tracking**: Display tokens/cost per subagent
5. **Widgets**: Live progress indicator in footer

## Package Distribution

Will be installable as:

```bash
# From npm (when published)
pi install npm:josh-pi-subagents

# From git
pi install git:github.com/josh/josh-pi-subagents

# Local development
pi install ./josh-pi-subagents
```

## Development Setup

```bash
cd josh-pi-subagents
npm install  # if any deps
pi install ./
```

Then create agents in `~/.pi/agent/agents/`:
```bash
mkdir -p ~/.pi/agent/agents
cp agents/*.md ~/.pi/agent/agents/
```

## Open Questions

1. Should we include default agents (researcher, reviewer, worker) in the package?
2. Should we support project-local agents (`.pi/agents/`) in v1?
3. Error handling: retry logic or fail fast?
4. Timeout handling for long-running subagents?
