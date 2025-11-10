// src/runner.ts

import type {
  PreToolUseHookInput as SDKHookInput,
  HookJSONOutput as SDKHookOutput,
  SyncHookJSONOutput as SDKSyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";
import {
  decidePermission,
  type BashApprovalConfig,
  type PermissionDecision,
} from "./engine";

export type { BashApprovalConfig } from "./engine";

/** Emit the JSON result in Anthropic's expected shape. */
function buildOutput(decision: PermissionDecision): SDKHookOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
    } as Extract<
      NonNullable<SDKSyncHookJSONOutput["hookSpecificOutput"]>,
      { hookEventName: "PreToolUse" }
    >,
  };
}

/** Public entry: reads one JSON input from stdin, writes one JSON line to stdout. */
export async function runBashApprovalHook(config: BashApprovalConfig = {}): Promise<void> {
  const input = (await Bun.stdin.json()) as SDKHookInput;

  // await Bun.write(`debug-hooks-input-${input.session_id}-${input.hook_event_name}-${input.tool_name}-${Date.now()}.json`, JSON.stringify(input, null, 2));

  const decision = decidePermission(
    { tool_name: input.tool_name, tool_input: input.tool_input },
    config
  );

  const out = buildOutput(decision);
  await Bun.stdout.write(JSON.stringify(out));
}
