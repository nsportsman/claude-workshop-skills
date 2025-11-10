import { runBashApprovalHook } from "./hooks.base";

const allow = `
Bash
Skill
Write
Read
Edit
Search
`;

const allowToolPattern = `
mcp__chrome-devtools__
`

const denyBash = `
rm -rf
sudo
--force
`

await runBashApprovalHook({ allowToolPattern, allow, denyBash });

