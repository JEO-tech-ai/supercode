/**
 * Frontend Agent
 * UI/UX specialist for visual changes and styling.
 * Adapted from Oh-My-OpenCode for SuperCode integration.
 */

import type {
  Agent,
  AgentContext,
  AgentResult,
  AgentPromptMetadata,
} from "./types";
import { streamAIResponse } from "../models";
import logger from "../../shared/logger";

/**
 * Frontend agent metadata for delegation
 */
export const FRONTEND_METADATA: AgentPromptMetadata = {
  category: "specialist",
  cost: "CHEAP",
  triggers: [
    {
      domain: "Visual Design",
      trigger: "Colors, spacing, typography, shadows, borders → frontend specialist",
    },
    {
      domain: "Layout",
      trigger: "Flexbox, grid, positioning, responsive design → frontend specialist",
    },
    {
      domain: "Animation",
      trigger: "Transitions, animations, motion design → frontend specialist",
    },
    {
      domain: "Component Styling",
      trigger: "CSS, Tailwind, styled-components styling → frontend specialist",
    },
  ],
  useWhen: [
    "Changing colors, fonts, or spacing",
    "Updating layout or positioning",
    "Adding animations or transitions",
    "Responsive design adjustments",
    "Icon or image styling",
    "Visual polish and refinement",
  ],
  avoidWhen: [
    "Pure logic changes (API calls, state management)",
    "Event handlers or business logic",
    "Data fetching or validation",
    "Non-visual component changes",
  ],
  keyTrigger: "Visual/UI changes detected → delegate to frontend specialist",
  dedicatedSection: `
The Frontend agent is a designer-turned-developer with strong aesthetic sensibility.

**Decision Gate**:
- Visual changes (colors, layout, animation) → Frontend specialist
- Pure logic (API, state, handlers) → Handle directly

**Aesthetic Philosophy**:
- BOLD direction over safe choices
- Cohesive color palettes
- Purposeful motion
- Distinctive typography
`,
};

/**
 * Frontend system prompt
 */
const FRONTEND_PROMPT = `You are the Frontend UI/UX Specialist, a designer-turned-developer with exceptional aesthetic sensibility.

## Primary Responsibilities

1. **Visual Design**
   - Color schemes and palettes
   - Typography and fonts
   - Spacing and rhythm
   - Shadows and depth

2. **Layout Design**
   - Flexbox and Grid systems
   - Responsive breakpoints
   - Component composition
   - Visual hierarchy

3. **Motion Design**
   - Transitions and animations
   - Micro-interactions
   - Loading states
   - Page transitions

## Aesthetic Philosophy

- **BOLD over safe**: Make distinctive choices
- **Cohesive palettes**: Colors should work together
- **Purposeful motion**: Animation should enhance UX
- **Typography hierarchy**: Clear visual structure

## Technical Skills

- CSS/SCSS
- Tailwind CSS
- CSS-in-JS (styled-components, emotion)
- Framer Motion
- CSS animations

## Output Format

When making visual changes:

1. **Describe the change**: What will be visually different
2. **Show the code**: Complete, ready-to-use code
3. **Explain the choice**: Why this approach works
4. **Consider states**: Hover, focus, active, disabled

## Code Standards

- Use semantic class names
- Follow existing style patterns
- Consider accessibility (contrast, focus states)
- Test responsive breakpoints
- Prefer CSS variables for theming

## Allowed Tools

- read: Read files to understand current styling
- write: Write new style files
- edit: Modify existing styles
- glob: Find style files
- grep: Search for style patterns

## Decision Gate

Ask yourself:
- Is this a VISUAL change? → Handle it
- Is this PURE LOGIC? → Decline and explain

Examples:
- "Change button color" → Handle it
- "Add click handler" → Decline (pure logic)
- "Add loading spinner" → Handle it (visual)
- "Fetch user data" → Decline (pure logic)
`;

/**
 * Create frontend agent
 */
export function createFrontend(): Agent {
  return {
    name: "frontend",
    displayName: "Frontend Specialist",
    model: "gemini-2.5-pro",
    capabilities: [
      "Visual design",
      "CSS/styling",
      "Layout systems",
      "Animation/motion",
      "Responsive design",
    ],
    allowedTools: ["read", "write", "edit", "glob", "grep"],
    metadata: FRONTEND_METADATA,

    async execute(prompt: string, context?: AgentContext): Promise<AgentResult> {
      logger.info(`[Frontend] Starting work: ${prompt.slice(0, 100)}...`);

      try {
        const response = await streamAIResponse({
          provider: "google",
          model: "gemini-2.5-pro",
          messages: [
            { role: "system", content: FRONTEND_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.5,
          maxTokens: 8192,
        });

        const content = response.text;

        logger.info(`[Frontend] Work complete`);

        return {
          success: true,
          content,
          model: "gemini-2.5-pro",
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Frontend] Error: ${errorMessage}`);

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  };
}

export const frontend = createFrontend();
