const EXCLUDED_ENV_PATTERNS: RegExp[] = [
  /^NPM_CONFIG_/i,
  /^npm_config_/,
  /^YARN_/,
  /^PNPM_/,
  /^NO_UPDATE_NOTIFIER$/,
];

export function createCleanMcpEnvironment(
  customEnv: Record<string, string> = {}
): Record<string, string> {
  const cleanEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;

    const shouldExclude = EXCLUDED_ENV_PATTERNS.some((pattern) =>
      pattern.test(key)
    );
    if (!shouldExclude) {
      cleanEnv[key] = value;
    }
  }

  Object.assign(cleanEnv, customEnv);

  return cleanEnv;
}

export function expandEnvVars(str: string): string {
  return str.replace(/\$\{?(\w+)\}?/g, (_, varName) => {
    return process.env[varName] || "";
  });
}

export function expandEnvVarsInObject<T>(obj: T): T {
  if (typeof obj === "string") {
    return expandEnvVars(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => expandEnvVarsInObject(item)) as T;
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvVarsInObject(value);
    }
    return result as T;
  }
  return obj;
}
