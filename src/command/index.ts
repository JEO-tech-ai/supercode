export {
  CommandInfoSchema,
  commandRegistry,
  loadCommands,
  getCommand,
  listCommands,
  registerCommand,
  type CommandInfo,
  type CommandExecuteOptions,
} from "./registry";

export {
  expandTemplate,
  parseCommandArgs,
  detectFilePaths,
  type TemplateExpandOptions,
  type ExpandResult,
} from "./template";

export {
  configureMCPDiscovery,
  discoverMCPCommands,
  executeMCPCommand,
  parseMCPCommandArgs,
  formatMCPCommandHelp,
  type MCPServer,
  type MCPCommandInfo,
  type MCPDiscoveryOptions,
} from "./mcp-discovery";

export {
  executeCommand,
  isCommand,
  getCommandName,
  getCommandHelp,
  getAllCommandsHelp,
  type CommandExecuteContext,
  type CommandExecuteResult,
  type SubtaskOptions,
  type SendPromptOptions,
} from "./executor";
