import type { Hook, HookEvent, HookContext, HookResult } from "./types";

export interface IHookRegistry {
  register(hook: Hook): void;
  unregister(name: string): boolean;
  get(name: string): Hook | undefined;
  getForEvent(event: HookEvent): Hook[];
  trigger(event: HookEvent, context: HookContext): Promise<HookResult | void>;
  list(): Hook[];
}

class HookRegistry implements IHookRegistry {
  private hooks: Map<string, Hook> = new Map();

  register(hook: Hook): void {
    this.hooks.set(hook.name, hook);
  }

  unregister(name: string): boolean {
    return this.hooks.delete(name);
  }

  get(name: string): Hook | undefined {
    return this.hooks.get(name);
  }

  getForEvent(event: HookEvent): Hook[] {
    return Array.from(this.hooks.values())
      .filter((hook) => hook.events.includes(event))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  async trigger(event: HookEvent, context: HookContext): Promise<HookResult | void> {
    const hooks = this.getForEvent(event);

    for (const hook of hooks) {
      try {
        const result = await hook.handler(context);
        if (result && result.continue === false) {
          return result;
        }
      } catch (error) {
        console.error(`Hook ${hook.name} failed:`, error);
      }
    }
  }

  list(): Hook[] {
    return Array.from(this.hooks.values());
  }
}

let hookRegistryInstance: HookRegistry | null = null;

export function getHookRegistry(): IHookRegistry {
  if (!hookRegistryInstance) {
    hookRegistryInstance = new HookRegistry();
  }
  return hookRegistryInstance;
}
