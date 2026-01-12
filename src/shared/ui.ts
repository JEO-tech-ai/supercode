export * from "./theme";
export * from "./toast";
export * from "./dialog";
export * from "./keybind";

import { AnsiCode } from "./theme";
import { EOL } from "os";

export class CancelledError extends Error {
  constructor(message = "Operation cancelled") {
    super(message);
    this.name = "CancelledError";
  }
}

const LOGO = [
  [`█▀▀ █░░█ █▀▀█ █▀▀▀ █▀▀█ `, `█▀▀▀ █▀▀█ █▀▀▄ █▀▀▀`],
  [`▀▀█ █░░█ █▀▀▀ █▀▀▀ █▄▄▀ `, `█░░░ █░░█ █░░█ █▀▀▀`],
  [`▀▀▀ ░▀▀▀ ▀░░░ ▀▀▀▀ ▀░▀▀ `, `▀▀▀▀ ▀▀▀▀ ▀▀▀░ ▀▀▀▀`],
];

export const Style = {
  TEXT_DIM: "\x1b[90m",
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
  BLUE: "\x1b[34m",
  CYAN: "\x1b[36m",

  TEXT_HIGHLIGHT: "\x1b[96m",
  TEXT_HIGHLIGHT_BOLD: "\x1b[96m\x1b[1m",
  TEXT_DIM_BOLD: "\x1b[90m\x1b[1m",
  TEXT_NORMAL: "\x1b[0m",
  TEXT_NORMAL_BOLD: "\x1b[1m",
  TEXT_WARNING: "\x1b[93m",
  TEXT_WARNING_BOLD: "\x1b[93m\x1b[1m",
  TEXT_DANGER: "\x1b[91m",
  TEXT_DANGER_BOLD: "\x1b[91m\x1b[1m",
  TEXT_SUCCESS: "\x1b[92m",
  TEXT_SUCCESS_BOLD: "\x1b[92m\x1b[1m",
  TEXT_INFO: "\x1b[94m",
  TEXT_INFO_BOLD: "\x1b[94m\x1b[1m",
} as const;

let blank = false;

export function println(...message: string[]): void {
  print(...message);
  process.stderr.write(EOL);
}

/**
 * Print to stderr without newline
 */
export function print(...message: string[]): void {
  blank = false;
  process.stderr.write(message.join(" "));
}

/**
 * Print an empty line for visual spacing (only once)
 */
export function empty(): void {
  if (blank) return;
  println("" + Style.TEXT_NORMAL);
  blank = true;
}

/**
 * Display the SuperCoin logo (OpenCode-style)
 */
export function logo(pad?: string): string {
  const result: string[] = [];
  for (const row of LOGO) {
    if (pad) result.push(pad);
    result.push("\x1b[90m"); // gray
    result.push(row[0]);
    result.push("\x1b[0m");
    result.push(row[1]);
    result.push(EOL);
  }
  return result.join("").trimEnd();
}

export function error(message: string): void {
  println(Style.TEXT_DANGER_BOLD + "Error: " + Style.TEXT_NORMAL + message);
}

export function info(message: string): void {
  println(Style.TEXT_INFO_BOLD + "Info: " + Style.TEXT_NORMAL + message);
}

export function success(message: string): void {
  println(Style.TEXT_SUCCESS_BOLD + "[+] " + Style.TEXT_NORMAL + message);
}

export function warning(message: string): void {
  println(Style.TEXT_WARNING_BOLD + "! " + Style.TEXT_NORMAL + message);
}

export function dim(text: string): string {
  return `${Style.TEXT_DIM}${text}${Style.RESET}`;
}

export function bold(text: string): string {
  return `${Style.BOLD}${text}${Style.RESET}`;
}

export function color(text: string, colorCode: string): string {
  return `${colorCode}${text}${Style.RESET}`;
}

export function formatProviderStatus(name: string, authenticated: boolean): string {
  const icon = authenticated ? "[+]" : "[ ]";
  const iconColor = authenticated ? Style.GREEN : Style.TEXT_DIM;
  return `${iconColor}${icon}${Style.RESET} ${name}`;
}

export function tableRow(columns: string[], widths: number[]): string {
  return columns
    .map((col, i) => col.padEnd(widths[i] || 10))
    .join(" │ ");
}

export function tableSeparator(widths: number[]): string {
  return widths.map((w) => "─".repeat(w)).join("─┼─");
}

export function markdown(text: string): string {
  return text;
}

export async function input(prompt: string): Promise<string> {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export const UI = {
  CancelledError,
  Style,
  empty,
  println,
  print,
  logo,
  error,
  info,
  success,
  warning,
  dim,
  bold,
  color,
  formatProviderStatus,
  tableRow,
  tableSeparator,
  markdown,
  input,
};

export default UI;
