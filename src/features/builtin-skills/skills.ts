import type { BuiltinSkill } from "./types";

const playwrightSkill: BuiltinSkill = {
  name: "playwright",
  description:
    "MUST USE for any browser-related tasks. Browser automation via Playwright MCP - verification, browsing, information gathering, web scraping, testing, screenshots, and all browser interactions.",
  template: `# Playwright Browser Automation

This skill provides browser automation capabilities via the Playwright MCP server.

## Available Tools

When this skill is active, you have access to browser automation tools:
- Navigate to URLs
- Take screenshots
- Click elements
- Fill forms
- Extract text and data
- Run automated tests

## Usage

Use the MCP tools prefixed with 'playwright_' to interact with the browser.`,
  mcpConfig: {
    playwright: {
      command: "npx",
      args: ["@playwright/mcp@latest"],
    },
  },
};

export function createBuiltinSkills(): BuiltinSkill[] {
  return [playwrightSkill];
}

export function getBuiltinSkillByName(name: string): BuiltinSkill | undefined {
  const skills = createBuiltinSkills();
  return skills.find((s) => s.name === name);
}
