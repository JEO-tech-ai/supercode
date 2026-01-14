/**
 * Multimodal Agent
 * PDF, image, and diagram analysis specialist.
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
 * Multimodal agent metadata for delegation
 */
export const MULTIMODAL_METADATA: AgentPromptMetadata = {
  category: "utility",
  cost: "CHEAP",
  triggers: [
    {
      domain: "PDF Analysis",
      trigger: "PDF file needs reading or extraction → multimodal agent",
    },
    {
      domain: "Image Analysis",
      trigger: "Screenshot, diagram, or image interpretation → multimodal agent",
    },
    {
      domain: "Visual Documentation",
      trigger: "Architecture diagrams, flowcharts, wireframes → multimodal agent",
    },
  ],
  useWhen: [
    "Reading PDF documents",
    "Analyzing screenshots",
    "Interpreting diagrams or flowcharts",
    "Extracting text from images",
    "Understanding visual documentation",
  ],
  avoidWhen: [
    "Reading plain text files (use read tool)",
    "Source code files (use read tool)",
    "JSON/YAML/config files (use read tool)",
  ],
  keyTrigger: "PDF/image file referenced → delegate to multimodal agent",
  dedicatedSection: `
The Multimodal agent handles files that can't be read as plain text.

**Use Cases**:
- PDF documents (reports, papers, specs)
- Screenshots (UI, error messages, terminals)
- Diagrams (architecture, flow, UML)
- Images (wireframes, mockups)

**Output**: Extracted text/information ready for processing.
`,
};

/**
 * Multimodal system prompt
 */
const MULTIMODAL_PROMPT = `You are the Multimodal Analyst, specialized in processing visual content.

## Primary Responsibilities

1. **PDF Analysis**
   - Extract text content
   - Identify key sections and structure
   - Summarize main points
   - Note any tables, figures, or diagrams

2. **Image Analysis**
   - Describe visual content
   - Extract any visible text (OCR)
   - Identify UI elements
   - Note layout and structure

3. **Diagram Interpretation**
   - Explain architecture diagrams
   - Describe flowcharts and processes
   - Identify components and relationships
   - Translate visual information to text

## Output Format

### For PDFs
\`\`\`
# Document Title

## Summary
[Brief overview]

## Key Sections
1. [Section name]: [Summary]
2. [Section name]: [Summary]

## Important Details
- [Detail 1]
- [Detail 2]

## Tables/Figures
- [Description of any visual elements]
\`\`\`

### For Images
\`\`\`
# Image Analysis

## Content Type
[Screenshot/Diagram/UI/etc.]

## Description
[Detailed description]

## Extracted Text
[Any visible text]

## Key Elements
- [Element 1]
- [Element 2]
\`\`\`

### For Diagrams
\`\`\`
# Diagram Analysis

## Type
[Architecture/Flow/UML/etc.]

## Components
1. [Component]: [Description]
2. [Component]: [Description]

## Relationships
- [Component A] → [Component B]: [Relationship]

## Notes
[Additional observations]
\`\`\`

## Guidelines

1. **Be Thorough**: Capture all relevant information
2. **Be Structured**: Use consistent formatting
3. **Be Accurate**: Don't invent content not in the image
4. **Be Actionable**: Provide information that can be used

## Allowed Tools

- read: Read files (for image paths)
- glob: Find files
`;

/**
 * Create multimodal agent
 */
export function createMultimodal(): Agent {
  return {
    name: "multimodal",
    displayName: "Multimodal Analyst",
    model: "gemini-2.5-flash",
    capabilities: [
      "PDF analysis",
      "Image interpretation",
      "Diagram understanding",
      "OCR/text extraction",
    ],
    allowedTools: ["read", "glob"],
    metadata: MULTIMODAL_METADATA,

    async execute(prompt: string, context?: AgentContext): Promise<AgentResult> {
      logger.info(`[Multimodal] Starting analysis: ${prompt.slice(0, 100)}...`);

      try {
        const response = await streamAIResponse({
          provider: "google",
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: MULTIMODAL_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          maxTokens: 8192,
        });

        const content = response.text;

        logger.info(`[Multimodal] Analysis complete`);

        return {
          success: true,
          content,
          model: "gemini-2.5-flash",
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Multimodal] Error: ${errorMessage}`);

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  };
}

export const multimodal = createMultimodal();
