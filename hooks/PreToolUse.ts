import type { PreToolUseHookInput, HookJSONOutput } from "@anthropic-ai/claude-agent-sdk"

const input = await Bun.stdin.json() as PreToolUseHookInput

type BashToolInput = {
    command: string
    description: string
}

if (input.tool_name === "Bash") {
    const toolInput = input.tool_input as BashToolInput

    if (toolInput.command.startsWith("npm")) {
        const output: HookJSONOutput = {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason: "Never use npm. Always use pnpm"
            }
        }
        console.log(JSON.stringify(output, null, 2))
    }
}