import { runBashApprovalHook } from "./hooks.base";

const allow = `
Bash
Skill
Write
Read
Edit
`;

const includes = `
gh issue
gh label
node -p
`;

const denyBash = `
rm -rf
sudo
--force
`

await runBashApprovalHook({ includes, allow, denyBash });

