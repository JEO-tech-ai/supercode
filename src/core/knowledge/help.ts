import { EventEmitter } from 'events';
import { Log } from '../../shared/logger';
import type { KBQuery, KBSearchResult, KBEntry } from './types';
import { knowledgeBaseManager } from './manager';

export interface HelpContext {
  topic?: string;
  keywords?: string[];
  category?: string;
  tool?: string;
  command?: string;
}

export class InteractiveHelpSystem extends EventEmitter {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  async getHelp(context: HelpContext): Promise<string> {
    const results = await this.search(context);

    if (results.length === 0) {
      return this.generateFallbackResponse(context);
    }

    const response = this.formatResults(results, context);

    this.conversationHistory.push({
      role: 'user',
      content: this.contextToQuery(context),
    });

    this.conversationHistory.push({
      role: 'assistant',
      content: response,
    });

    return response;
  }

  async search(context: HelpContext): Promise<KBSearchResult[]> {
    const query: KBQuery = {
      text: this.contextToQuery(context),
      limit: 5,
    };

    if (context.category) {
      query.categories = [context.category];
    }

    return knowledgeBaseManager.search(query);
  }

  async suggestRelated(topic: string): Promise<string[]> {
    const query: KBQuery = {
      text: topic,
      limit: 10,
    };

    const results = knowledgeBaseManager.search(query);

    return results
      .flatMap(r => r.entry.tags)
      .filter((tag, i, arr) => arr.indexOf(tag) === i)
      .slice(0, 5);
  }

  async getTopicSummary(topic: string): Promise<string> {
    const query: KBQuery = {
      text: topic,
      limit: 3,
    };

    const results = knowledgeBaseManager.search(query);

    if (results.length === 0) {
      return `I couldn't find any information about "${topic}". Try searching for a different topic or use the browse command to explore available documentation.`;
    }

    const summary = results.map(r => r.entry.description).join('\n\n');

    return `## ${topic}\n\n${summary}`;
  }

  async listCategories(): Promise<string> {
    const categories = knowledgeBaseManager.listCategories();

    if (categories.length === 0) {
      return 'No documentation categories available.';
    }

    const categoryList = categories.map(c => `- ${c.name}: ${c.description}`).join('\n');

    return `## Documentation Categories\n\n${categoryList}`;
  }

  async getToolHelp(toolName: string): Promise<string> {
    const query: KBQuery = {
      text: toolName,
      types: ['tool'],
      limit: 1,
    };

    const results = knowledgeBaseManager.search(query);

    if (results.length === 0) {
      return `No documentation found for tool "${toolName}". Make sure the tool name is correct.`;
    }

    const tool = results[0].entry;

    let helpText = `## ${tool.title}\n\n`;
    helpText += `${tool.description}\n\n`;

    if (tool.content) {
      helpText += `### Usage\n\n${tool.content}\n\n`;
    }

    if (tool.tags && tool.tags.length > 0) {
      helpText += `**Tags:** ${tool.tags.join(', ')}\n`;
    }

    return helpText;
  }

  async getFAQ(query: string): Promise<string> {
    const kbQuery: KBQuery = {
      text: query,
      types: ['faq'],
      limit: 5,
    };

    const results = knowledgeBaseManager.search(kbQuery);

    if (results.length === 0) {
      return `No FAQs found matching "${query}". Try rephrasing your question.`;
    }

    let faqText = '## Frequently Asked Questions\n\n';

    for (const result of results) {
      faqText += `### Q: ${result.entry.title}\n\n`;
      faqText += `${result.entry.description}\n\n`;

      if (result.entry.content) {
        faqText += `${result.entry.content}\n\n`;
      }
    }

    return faqText;
  }

  async getTroubleshooting(issue: string): Promise<string> {
    const query: KBQuery = {
      text: issue,
      types: ['troubleshooting'],
      limit: 5,
    };

    const results = knowledgeBaseManager.search(query);

    if (results.length === 0) {
      return `No troubleshooting information found for "${issue}". Try describing the issue differently or provide more details.`;
    }

    let text = '## Troubleshooting Guide\n\n';

    for (const result of results) {
      text += `### ${result.entry.title}\n\n`;
      text += `${result.entry.description}\n\n`;

      if (result.entry.content) {
        text += `**Solution:**\n${result.entry.content}\n\n`;
      }
    }

    return text;
  }

  async getBestPractices(topic: string): Promise<string> {
    const query: KBQuery = {
      text: topic,
      types: ['best-practice'],
      limit: 5,
    };

    const results = knowledgeBaseManager.search(query);

    if (results.length === 0) {
      return `No best practices found for "${topic}". Consider contributing documentation for this topic.`;
    }

    let text = `## Best Practices: ${topic}\n\n`;

    for (const result of results) {
      text += `### ${result.entry.title}\n\n`;
      text += `${result.entry.description}\n\n`;

      if (result.entry.content) {
        text += `${result.entry.content}\n\n`;
      }
    }

    return text;
  }

  async interactiveSearch(prompt: string): Promise<string> {
    this.emit('search.started', { prompt });

    const results = await knowledgeBaseManager.search({
      text: prompt,
      limit: 5,
    });

    this.emit('search.completed', { prompt, count: results.length });

    if (results.length === 0) {
      return `No results found for "${prompt}". Try:\n- Using different keywords\n- Checking your spelling\n- Browsing documentation categories`;
    }

    let response = `## Search Results for "${prompt}"\n\n`;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      response += `${i + 1}. **${result.entry.title}**\n`;
      response += `   ${result.entry.description}\n`;
      response += `   Score: ${result.score}\n\n`;

      if (result.highlights && result.highlights.length > 0) {
        response += `   **Highlights:**\n`;
        for (const highlight of result.highlights) {
          response += `   - ${highlight.text}...\n`;
        }
        response += '\n';
      }
    }

    return response;
  }

  async followUp(question: string): Promise<string> {
    const lastAssistantMessage = [...this.conversationHistory]
      .reverse()
      .find(m => m.role === 'assistant');

    if (!lastAssistantMessage) {
      return this.getHelp({});
    }

    const context = this.extractContextFromHistory();
    const query = `${lastAssistantMessage.content}\n\nFollow-up: ${question}`;

    return this.getHelp({ topic: query });
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [...this.conversationHistory];
  }

  private contextToQuery(context: HelpContext): string {
    const parts: string[] = [];

    if (context.topic) {
      parts.push(context.topic);
    }

    if (context.tool) {
      parts.push(`tool ${context.tool}`);
    }

    if (context.command) {
      parts.push(`command ${context.command}`);
    }

    if (context.keywords && context.keywords.length > 0) {
      parts.push(...context.keywords);
    }

    return parts.join(' ');
  }

  private formatResults(results: KBSearchResult[], context: HelpContext): string {
    if (results.length === 0) {
      return this.generateFallbackResponse(context);
    }

    let response = '## Help Results\n\n';

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      response += `### ${result.entry.title}\n\n`;
      response += `${result.entry.description}\n\n`;

      if (result.entry.content) {
        response += `${result.entry.content}\n\n`;
      }

      if (result.entry.tags && result.entry.tags.length > 0) {
        response += `**Tags:** ${result.entry.tags.join(', ')}\n\n`;
      }
    }

    return response;
  }

  private generateFallbackResponse(context: HelpContext): string {
    let response = "I couldn't find specific documentation for your request.\n\n";

    response += "Try these options:\n";
    response += "- Search for a different topic\n";
    response += "- Browse documentation categories\n";
    response += "- Get help with a specific tool or command\n";
    response += "- View frequently asked questions\n";
    response += "- Check troubleshooting guides\n";

    if (context.tool) {
      response += `\n**Tip:** Try "tool ${context.tool}" for tool-specific help.\n`;
    }

    return response;
  }

  private extractContextFromHistory(): string {
    return this.conversationHistory
      .slice(-3)
      .map(m => m.content)
      .join('\n\n');
  }
}

export const interactiveHelpSystem = new InteractiveHelpSystem();
