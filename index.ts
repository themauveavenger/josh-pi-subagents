/**
 * Minimalist Subagent Extension
 * 
 * Delegate tasks to specialized agents with isolated context windows.
 * Based on pi's built-in subagent example, stripped to essentials.
 * 
 * Features:
 * - Single-agent delegation only (no chains, no parallel)
 * - .md agent definitions with YAML frontmatter
 * - Returns only final summary (not full conversation history)
 * - User-scope agents by default (simpler security model)
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Message } from "@earendil-works/pi-ai";
import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { type AgentConfig, type AgentScope, discoverAgents } from "./agents.js";

interface SubagentResult {
  agent: string;
  agentSource: "user" | "project" | "unknown";
  task: string;
  exitCode: number;
  output: string;
  stderr: string;
  model?: string;
  stopReason?: string;
  errorMessage?: string;
}

interface DelegateDetails {
  agent: string;
  agentSource: string;
  task: string;
  exitCode: number;
  model?: string;
}

/**
 * Extract only the final assistant message text
 * This keeps parent context clean - no full conversation history
 */
function getFinalOutput(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "assistant") {
      for (const part of msg.content) {
        if (part.type === "text") return part.text;
      }
    }
  }
  return "";
}

/**
 * Get the pi invocation command
 */
function getPiInvocation(args: string[]): { command: string; args: string[] } {
  const currentScript = process.argv[1];
  const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
  if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
    return { command: process.execPath, args: [currentScript, ...args] };
  }

  const execName = path.basename(process.execPath).toLowerCase();
  const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
  if (!isGenericRuntime) {
    return { command: process.execPath, args };
  }

  return { command: "pi", args };
}

/**
 * Run a single subagent and return its final output
 */
async function runSubagent(
  defaultCwd: string,
  agent: AgentConfig,
  task: string,
  cwd: string | undefined,
  signal: AbortSignal | undefined
): Promise<SubagentResult> {
  const args: string[] = ["--mode", "json", "-p", "--no-session"];
  if (agent.model) args.push("--model", agent.model);
  if (agent.tools && agent.tools.length > 0) args.push("--tools", agent.tools.join(","));

  // Write agent system prompt to temp file
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-subagent-"));
  const tmpFile = path.join(tmpDir, `prompt-${agent.name}.md`);
  await fs.promises.writeFile(tmpFile, agent.systemPrompt, { encoding: "utf-8", mode: 0o600 });

  const result: SubagentResult = {
    agent: agent.name,
    agentSource: agent.source,
    task,
    exitCode: 0,
    output: "",
    stderr: "",
    model: agent.model,
  };

  try {
    args.push("--append-system-prompt", tmpFile);
    args.push(`Task: ${task}`);

    const messages: Message[] = [];
    let wasAborted = false;

    const exitCode = await new Promise<number>((resolve) => {
      const invocation = getPiInvocation(args);
      const proc = spawn(invocation.command, invocation.args, {
        cwd: cwd ?? defaultCwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let buffer = "";

      const processLine = (line: string) => {
        if (!line.trim()) return;
        let event: any;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }

        if (event.type === "message_end" && event.message) {
          const msg = event.message as Message;
          messages.push(msg);

          if (msg.role === "assistant") {
            if (!result.model && msg.model) result.model = msg.model;
            if (msg.stopReason) result.stopReason = msg.stopReason;
            if (msg.errorMessage) result.errorMessage = msg.errorMessage;
          }
        }
      };

      proc.stdout.on("data", (data) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) processLine(line);
      });

      proc.stderr.on("data", (data) => {
        result.stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (buffer.trim()) processLine(buffer);
        resolve(code ?? 0);
      });

      proc.on("error", () => {
        resolve(1);
      });

      if (signal) {
        const killProc = () => {
          wasAborted = true;
          proc.kill("SIGTERM");
          setTimeout(() => {
            if (!proc.killed) proc.kill("SIGKILL");
          }, 5000);
        };
        if (signal.aborted) killProc();
        else signal.addEventListener("abort", killProc, { once: true });
      }
    });

    result.exitCode = exitCode;
    result.output = getFinalOutput(messages);

    if (wasAborted) {
      result.errorMessage = "Subagent was aborted";
    }

    return result;
  } finally {
    // Cleanup temp files
    try {
      await fs.promises.unlink(tmpFile);
    } catch {
      /* ignore */
    }
    try {
      await fs.promises.rmdir(tmpDir);
    } catch {
      /* ignore */
    }
  }
}

// Schema for the delegate tool
const AgentScopeSchema = StringEnum(["user", "project", "both"] as const, {
  description: 'Which agent directories to use. Default: "user".',
  default: "user",
});

const DelegateParams = Type.Object({
  agent: Type.String({ description: "Name of the agent to invoke" }),
  task: Type.String({ description: "Task to delegate to the agent" }),
  agentScope: Type.Optional(AgentScopeSchema),
  cwd: Type.Optional(Type.String({ description: "Working directory for the agent process" })),
});

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "delegate",
    label: "Delegate",
    description: [
      "Delegate a task to a specialized subagent with isolated context.",
      'Agents are defined in ~/.pi/agent/agents/*.md with YAML frontmatter.',
      "Returns only the final summary (not full conversation history).",
    ].join(" "),
    parameters: DelegateParams,

    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const agentScope: AgentScope = params.agentScope ?? "user";
      const discovery = discoverAgents(ctx.cwd, agentScope);
      const agents = discovery.agents;

      // If no agents are defined at all, provide helpful error
      if (agents.length === 0) {
        const helpMessage = [
          "No agents found. You must define agents before using the delegate tool.",
          "",
          "Create agent definitions (.md files with YAML frontmatter) in:",
          "  - ~/.pi/agent/agents/*.md     (user-level, always available)",
          "  - ./.pi/agents/*.md           (project-level, requires agentScope: 'project')",
          "",
          "Example agent definition:",
          "  ---",
          "  name: researcher",
          "  description: Research specialist for finding code",
          "  model: opencode-go/kimi-k2.5",
          "  tools: read, grep, find",
          "  ---",
          "  You are a research specialist. Find information and return concise results.",
          "",
          `Current agentScope: "${agentScope}"`,
        ].join("\n");

        return {
          content: [{ type: "text", text: helpMessage }],
          details: { agent: params.agent, task: params.task, exitCode: 1 },
          isError: true,
        };
      }

      // Find the requested agent
      const agent = agents.find((a) => a.name === params.agent);

      if (!agent) {
        const available = agents.map((a) => `"${a.name}"`).join(", ") || "none";
        return {
          content: [
            { type: "text", text: `Unknown agent: "${params.agent}". Available: ${available}.` },
          ],
          details: { agent: params.agent, task: params.task, exitCode: 1 },
          isError: true,
        };
      }

      // Run the subagent
      const result = await runSubagent(
        ctx.cwd,
        agent,
        params.task,
        params.cwd,
        signal
      );

      const isError = result.exitCode !== 0 || result.stopReason === "error" || result.stopReason === "aborted";

      const details: DelegateDetails = {
        agent: result.agent,
        agentSource: result.agentSource,
        task: result.task,
        exitCode: result.exitCode,
        model: result.model,
      };

      if (isError) {
        const errorMsg = result.errorMessage || result.stderr || result.output || "(no output)";
        return {
          content: [{ type: "text", text: `Subagent failed: ${errorMsg}` }],
          details,
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: result.output || "(no output)" }],
        details,
      };
    },

    renderCall(args, theme, _context) {
      const scope: AgentScope = args.agentScope ?? "user";
      const agentName = args.agent || "...";
      const preview = args.task
        ? args.task.length > 60
          ? `${args.task.slice(0, 60)}...`
          : args.task
        : "...";

      const text =
        theme.fg("toolTitle", theme.bold("delegate ")) +
        theme.fg("accent", agentName) +
        theme.fg("muted", ` [${scope}]`) +
        "\n  " +
        theme.fg("dim", preview);

      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme, _context) {
      const details = result.details as DelegateDetails | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "(no output)", 0, 0);
      }

      const isError = details.exitCode !== 0;
      const icon = isError ? theme.fg("error", "✗") : theme.fg("success", "✓");
      const text = result.content[0]?.type === "text" ? result.content[0].text : "(no output)";

      const lines = [
        `${icon} ${theme.fg("toolTitle", theme.bold(details.agent))}${theme.fg("muted", ` (${details.agentSource})`)}`,
        theme.fg("dim", text),
      ];

      if (details.model) {
        lines.push(theme.fg("muted", `model: ${details.model}`));
      }

      return new Text(lines.join("\n"), 0, 0);
    },
  });
}