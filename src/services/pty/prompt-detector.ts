export interface PromptInfo {
  type: 'general' | 'confirmation' | 'password' | 'multi-line';
  prompt: string;
  suggestions: string[];
}

export class PromptDetector {
  private patterns = {
    general: [
      /\$\s*$/,                 // bash $
      />\s*$/,                  // fish >
      /\#\s*$/,                 // root #
      /%\s*$/,                  // zsh %
      /\?\s*$/,                 // command ?
    ],
    confirmation: [
      /\[yYnN\]$/,
      /\(y\/n\)$/,
      /\[y\/n\]$/,
      /Continue\?/,
      /Proceed\?/,
    ],
    password: [
      /Password:\s*$/,
      /password:\s*$/,
      /Enter password:\s*$/,
    ],
    multiLine: [
      />\s*$/,
      /\.\.\.\s*$/,
      /"/,
    ]
  };

  detect(data: string): PromptInfo | null {
    const trimmed = data.trim();

    // Check for password prompts
    for (const pattern of this.patterns.password) {
      if (pattern.test(trimmed)) {
        return {
          type: 'password',
          prompt: trimmed,
          suggestions: ['Enter password (hidden input)']
        };
      }
    }

    // Check for confirmation prompts
    for (const pattern of this.patterns.confirmation) {
      if (pattern.test(trimmed)) {
        return {
          type: 'confirmation',
          prompt: trimmed,
          suggestions: ['[y] Yes', '[n] No', '[Ctrl+C] Cancel']
        };
      }
    }

    // Check for multi-line prompts
    for (const pattern of this.patterns.multiLine) {
      if (pattern.test(trimmed)) {
        return {
          type: 'multi-line',
          prompt: trimmed,
          suggestions: ['Continue typing', '[Ctrl+D] Submit', '[Ctrl+C] Cancel']
        };
      }
    }

    // Check for general shell prompts
    for (const pattern of this.patterns.general) {
      if (pattern.test(trimmed)) {
        return {
          type: 'general',
          prompt: trimmed,
          suggestions: ['Enter command']
        };
      }
    }

    return null;
  }

  stripANSIColors(data: string): string {
    // Remove ANSI escape sequences
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    return data.replace(ansiRegex, '');
  }
}

// Global prompt detector instance
export const promptDetector = new PromptDetector();
