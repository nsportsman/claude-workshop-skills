// src/engine.ts

import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk";

type PreToolUseHookSpecificOutput = Extract<
  NonNullable<SyncHookJSONOutput["hookSpecificOutput"]>,
  { hookEventName: "PreToolUse" }
>;

export type PermissionDecision = PreToolUseHookSpecificOutput["permissionDecision"];

export interface BashApprovalConfig {
  includes?: string;   // newline-separated patterns to allow in Bash commands
  startsWith?: string; // newline-separated patterns to allow in Bash commands
  denyBash?: string;   // newline-separated patterns to deny in Bash commands
  allow?: string;      // newline-separated tool names to allow
  allowToolPattern?: string; // newline-separated patterns to match against tool names
}

export interface BashToolInput {
  command: string;
  description?: string;
}

export interface PreToolUseHookInputShape {
  tool_name: string;
  tool_input: unknown;
}

/** Pattern representation for predictable matching. */
export type Pattern =
  | { kind: "literal"; literal: string }
  | { kind: "regex"; regex: RegExp };

/** Normalized config with parsed patterns and resolved allowed tools. */
export interface NormalizedConfig {
  includes: Pattern[];
  startsWith: Pattern[];
  deny: Pattern[];
  allowedTools: string[]; // if empty, treated as ["Bash"]
  allowToolPatterns: Pattern[]; // patterns to match against tool names
}

/** Split a multiline string into trimmed, non-empty lines. */
export function splitLines(block?: string): string[] {
  return (block ?? "")
    .trim()
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Try to parse /regex/flags notation; otherwise treat as literal. */
export function parsePattern(raw: string): Pattern {
  const looksLikeRegex = raw.startsWith("/") && raw.lastIndexOf("/") > 0;
  if (!looksLikeRegex) return { kind: "literal", literal: raw };

  const lastSlash = raw.lastIndexOf("/");
  const pattern = raw.slice(1, lastSlash);
  const flags = raw.slice(lastSlash + 1);

  if (!pattern) return { kind: "literal", literal: raw };

  try {
    return { kind: "regex", regex: new RegExp(pattern, flags) };
  } catch {
    // Invalid regex -> fall back to literal (keeps original string, slashes included).
    return { kind: "literal", literal: raw };
  }
}

export function parsePatterns(block?: string): Pattern[] {
  return splitLines(block).map(parsePattern);
}

/** If allow-list is empty, default to only "Bash" (behavior preserved). */
export function resolveAllowedTools(allow?: string): string[] {
  const names = splitLines(allow);
  return names.length ? names : ["Bash"];
}

export function normalizeConfig(cfg: BashApprovalConfig = {}): NormalizedConfig {
  return {
    includes: parsePatterns(cfg.includes),
    startsWith: parsePatterns(cfg.startsWith),
    deny: parsePatterns(cfg.denyBash),
    allowedTools: resolveAllowedTools(cfg.allow),
    allowToolPatterns: parsePatterns(cfg.allowToolPattern),
  };
}

export function matchesIncludes(command: string, patterns: Pattern[]): boolean {
  return patterns.some(p =>
    p.kind === "literal" ? command.includes(p.literal) : p.regex.test(command)
  );
}

/**
 * For regex in startsWith, we respect the user's own anchors.
 * If they want real "starts-with", they can use ^ in the pattern.
 */
export function matchesStartsWith(command: string, patterns: Pattern[]): boolean {
  return patterns.some(p =>
    p.kind === "literal" ? command.startsWith(p.literal) : p.regex.test(command)
  );
}

/**
 * Check if command matches any deny pattern (supports both literal and regex).
 */
export function matchesDeny(command: string, patterns: Pattern[]): boolean {
  return patterns.some(p =>
    p.kind === "literal" ? command.includes(p.literal) : p.regex.test(command)
  );
}

/**
 * Central decision function. Pure & deterministic.
 * - If tool matches allowToolPatterns -> "allow"
 * - If tool is not in allow-list -> "ask"
 * - If tool is allowed and not "Bash" -> "allow" (preserves original behavior)
 * - If tool is "Bash":
 *    * Check deny patterns FIRST - if match -> "deny"
 *    * If no rules were provided -> "ask" (explicit; old code could produce no output)
 *    * allow if any startsWith/includes rule matches
 *    * otherwise "ask"
 */
export function decidePermission(
  input: PreToolUseHookInputShape,
  cfg: BashApprovalConfig = {}
): PermissionDecision {
  const norm = normalizeConfig(cfg);

  const toolName = input.tool_name;

  // Check tool name patterns first
  if (matchesStartsWith(toolName, norm.allowToolPatterns)) return "allow";

  const allowed = norm.allowedTools.includes(toolName);
  if (!allowed) return "ask";

  if (toolName !== "Bash") return "allow";

  const toolInput = (input.tool_input ?? {}) as Partial<BashToolInput>;
  const command = toolInput.command ?? "";

  // Check deny patterns first - they take precedence
  if (matchesDeny(command, norm.deny)) return "deny";

  const haveRules = norm.includes.length > 0 || norm.startsWith.length > 0;
  if (!haveRules) return "ask";

  if (matchesStartsWith(command, norm.startsWith)) return "allow";
  if (matchesIncludes(command, norm.includes)) return "allow";

  return "ask";
}
