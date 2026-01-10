export { bashTool } from "./bash-pty";
export { readTool, writeTool, editTool } from "./file";
export { grepTool, globTool } from "./search";
export { TodoWriteTool, TodoReadTool } from "./todo";

import { getToolRegistry } from "../tools";
import { bashTool } from "./bash";
import { readTool, writeTool, editTool } from "./file";
import { grepTool, globTool } from "./search";
import { TodoWriteTool, TodoReadTool } from "./todo";

export function initializeTools(): void {
  const registry = getToolRegistry();

  registry.register(bashTool);
  registry.register(readTool);
  registry.register(writeTool);
  registry.register(editTool);
  registry.register(grepTool);
  registry.register(globTool);
  registry.register(TodoWriteTool);
  registry.register(TodoReadTool);
}
