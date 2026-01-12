import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { TuiApp } from "../../tui";
import { resolveProviderFromConfig } from "../../config/project";
import { streamAIResponse } from "../../services/models/ai-sdk";
import type { AISDKProviderName } from "../../services/models/ai-sdk/types";

export function createTuiCommand(config: unknown): Command {
  return new Command("tui")
    .description("Launch the new OpenCode-style Text UI")
    .option("-t, --theme <name>", "Theme name (catppuccin, dracula, nord, tokyo-night, monokai)", "catppuccin")
    .option("-m, --mode <mode>", "Color mode (dark, light)", "dark")
    .option("-s, --session <id>", "Resume a specific session")
    .action(async (options) => {
      const projectConfig = await resolveProviderFromConfig();
      const provider = projectConfig.provider as AISDKProviderName;
      const model = projectConfig.model;

      // Message handler that integrates with AI SDK
      const handleSendMessage = async (message: string, sessionId: string): Promise<string> => {
        let response = "";

        await streamAIResponse({
          provider,
          model,
          baseURL: projectConfig.baseURL,
          temperature: projectConfig.temperature,
          maxTokens: projectConfig.maxTokens,
          messages: [{ role: "user", content: message }],
          onChunk: (text) => {
            response += text;
          },
        });

        return response;
      };

      const { waitUntilExit } = render(
        <TuiApp
          initialTheme={options.theme}
          initialMode={options.mode as "dark" | "light"}
          provider={provider}
          model={model}
          sessionId={options.session}
          onSendMessage={handleSendMessage}
        />
      );

      await waitUntilExit();
    });
}
