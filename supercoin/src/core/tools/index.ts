export { bashTool } from "./bash";
export { readTool, writeTool, editTool } from "./file";
export { grepTool, globTool } from "./search";

import { getToolRegistry } from "../tools";
import { bashTool } from "./bash";
import { readTool, writeTool, editTool } from "./file";
import { grepTool, globTool } from "./search";

export function initializeTools(): void {
  const registry = getToolRegistry();

  registry.register(bashTool);
  registry.register(readTool);
  registry.register(writeTool);
  registry.register(editTool);
  registry.register(grepTool);
  registry.register(globTool);
}
