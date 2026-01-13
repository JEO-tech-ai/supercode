export interface ParsedFrontmatter<T> {
  data: T;
  body: string;
}

export function parseFrontmatter<T = Record<string, unknown>>(
  content: string
): ParsedFrontmatter<T> {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      data: {} as T,
      body: content,
    };
  }

  const [, frontmatterStr, body] = match;
  const data: Record<string, unknown> = {};

  const lines = frontmatterStr.split(/\r?\n/);
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: string | boolean | number = line.slice(colonIndex + 1).trim();

    if (value === "true") {
      data[key] = true;
    } else if (value === "false") {
      data[key] = false;
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      data[key] = parseFloat(value);
    } else if (value.startsWith('"') && value.endsWith('"')) {
      data[key] = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      data[key] = value.slice(1, -1);
    } else {
      data[key] = value;
    }
  }

  return {
    data: data as T,
    body: body.trim(),
  };
}
