/**
 * Dialog System
 * Wraps @clack/prompts with consistent styling and theming
 * Inspired by OpenCode's dialog system
 */

import * as p from "@clack/prompts";
import { primary, muted } from "./theme";

/**
 * CancelledError - Thrown when user cancels an operation
 */
export class CancelledError extends Error {
  constructor(message = "Operation cancelled") {
    super(message);
    this.name = "CancelledError";
  }
}

/**
 * Check if a prompt result was cancelled
 */
export function isCancelled(value: unknown): value is symbol {
  return p.isCancel(value);
}

/**
 * Handle cancelled prompt - throws CancelledError
 */
export function handleCancel(value: unknown, message = "Operation cancelled"): void {
  if (isCancelled(value)) {
    throw new CancelledError(message);
  }
}

/**
 * Option for select/multiselect dialogs
 */
export interface SelectOption<T> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Group of options for grouped select
 */
export interface SelectGroup<T> {
  label: string;
  options: SelectOption<T>[];
}

/**
 * Common dialog options
 */
export interface DialogOptions {
  /** Message/prompt to display */
  message: string;
  /** Initial value */
  initialValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Validation function */
  validate?: (value: string) => string | void;
}

/**
 * Confirm dialog options
 */
export interface ConfirmOptions {
  message: string;
  initialValue?: boolean;
  active?: string;
  inactive?: string;
}

/**
 * Select dialog options
 */
export interface SelectOptions<T> {
  message: string;
  options: SelectOption<T>[];
  initialValue?: T;
  maxItems?: number;
}

/**
 * Multiselect dialog options
 */
export interface MultiselectOptions<T> {
  message: string;
  options: SelectOption<T>[];
  initialValues?: T[];
  required?: boolean;
  cursorAt?: T;
}

/**
 * Show a text input dialog
 * @throws CancelledError if user cancels
 */
export async function text(options: DialogOptions): Promise<string> {
  const result = await p.text({
    message: primary(options.message),
    placeholder: options.placeholder ? muted(options.placeholder) : undefined,
    initialValue: options.initialValue,
    validate: options.validate,
  });

  handleCancel(result);
  return result as string;
}

/**
 * Show a password input dialog (hidden input)
 * @throws CancelledError if user cancels
 */
export async function password(options: Omit<DialogOptions, "initialValue">): Promise<string> {
  const result = await p.password({
    message: primary(options.message),
    validate: options.validate,
  });

  handleCancel(result);
  return result as string;
}

/**
 * Show a confirm dialog
 * @throws CancelledError if user cancels
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
  const result = await p.confirm({
    message: primary(options.message),
    initialValue: options.initialValue ?? false,
    active: options.active ?? "Yes",
    inactive: options.inactive ?? "No",
  });

  handleCancel(result);
  return result as boolean;
}

export async function select<T>(options: SelectOptions<T>): Promise<T> {
  const mappedOptions = options.options.map((opt) => {
    const item: { value: T; label: string; hint?: string } = { value: opt.value, label: opt.label };
    if (opt.hint) item.hint = muted(opt.hint);
    return item;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await p.select({
    message: primary(options.message),
    options: mappedOptions as any,
    initialValue: options.initialValue,
    maxItems: options.maxItems,
  });

  handleCancel(result);
  return result as T;
}

export async function multiselect<T>(options: MultiselectOptions<T>): Promise<T[]> {
  const mappedOptions = options.options.map((opt) => {
    const item: { value: T; label: string; hint?: string } = { value: opt.value, label: opt.label };
    if (opt.hint) item.hint = muted(opt.hint);
    return item;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await p.multiselect({
    message: primary(options.message),
    options: mappedOptions as any,
    initialValues: options.initialValues,
    required: options.required ?? false,
    cursorAt: options.cursorAt,
  });

  handleCancel(result);
  return result as T[];
}

export async function groupMultiselect<T>(options: {
  message: string;
  groups: SelectGroup<T>[];
  initialValues?: T[];
  required?: boolean;
}): Promise<T[]> {
  const groupedOptions: Record<string, Array<{ value: T; label: string; hint?: string }>> = {};

  for (const group of options.groups) {
    groupedOptions[group.label] = group.options.map((opt) => {
      const item: { value: T; label: string; hint?: string } = { value: opt.value, label: opt.label };
      if (opt.hint) item.hint = muted(opt.hint);
      return item;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await p.groupMultiselect({
    message: primary(options.message),
    options: groupedOptions as any,
    initialValues: options.initialValues,
    required: options.required ?? false,
  });

  handleCancel(result);
  return result as T[];
}

/**
 * Show an intro message
 */
export function intro(title?: string): void {
  p.intro(title ? primary(title) : undefined);
}

/**
 * Show an outro message
 */
export function outro(message?: string): void {
  p.outro(message ? primary(message) : undefined);
}

/**
 * Create a spinner for async operations
 */
export function spinner(): ReturnType<typeof p.spinner> {
  return p.spinner();
}

/**
 * Run a task with a spinner
 */
export async function withSpinner<T>(
  message: string,
  task: () => Promise<T>,
  successMessage?: string
): Promise<T> {
  const s = spinner();
  s.start(message);

  try {
    const result = await task();
    s.stop(successMessage ?? message);
    return result;
  } catch (error) {
    s.stop(`Failed: ${message}`);
    throw error;
  }
}

export async function runTasks(
  taskList: {
    title: string;
    task: () => Promise<void>;
  }[]
): Promise<void> {
  for (const t of taskList) {
    const s = spinner();
    s.start(primary(t.title));
    try {
      await t.task();
      s.stop(primary(t.title));
    } catch (error) {
      s.stop(`Failed: ${t.title}`);
      throw error;
    }
  }
}

/**
 * Note/log a message in dialog style
 */
export function note(message: string, title?: string): void {
  p.note(message, title ? primary(title) : undefined);
}

/**
 * Dialog namespace for grouped exports
 */
export const Dialog = {
  text,
  password,
  confirm,
  select,
  multiselect,
  groupMultiselect,
  isCancelled,
  handleCancel,
  CancelledError,
  intro,
  outro,
  spinner,
  withSpinner,
  runTasks,
  note,
};

export default Dialog;
