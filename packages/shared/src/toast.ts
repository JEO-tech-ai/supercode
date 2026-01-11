/**
 * Toast Notification System
 * Wraps @clack/prompts logging with consistent styling
 * Inspired by OpenCode's toast system
 */

import * as p from "@clack/prompts";
import { colors, themed } from "./theme";

/**
 * Toast variant types
 */
export type ToastVariant = "info" | "success" | "warning" | "error";

/**
 * Toast options
 */
export interface ToastOptions {
  /** Toast variant determines color and icon */
  variant: ToastVariant;
  /** Message to display */
  message: string;
  /** Optional title (prepended to message) */
  title?: string;
}

/**
 * Get icon for toast variant
 */
function getIcon(variant: ToastVariant): string {
  switch (variant) {
    case "info":
      return "ℹ";
    case "success":
      return "✓";
    case "warning":
      return "⚠";
    case "error":
      return "✗";
  }
}

/**
 * Get theme color key for variant
 */
function getColorKey(variant: ToastVariant): "info" | "success" | "warning" | "error" {
  return variant;
}

/**
 * Format toast message with optional title
 */
function formatMessage(options: ToastOptions): string {
  const { variant, message, title } = options;
  const icon = getIcon(variant);
  const colorKey = getColorKey(variant);

  if (title) {
    return `${themed(icon, colorKey)} ${themed(title, colorKey)}: ${message}`;
  }
  return `${themed(icon, colorKey)} ${message}`;
}

/**
 * Show a toast notification
 */
export function toast(options: ToastOptions): void {
  const formattedMessage = formatMessage(options);

  switch (options.variant) {
    case "info":
      p.log.info(formattedMessage);
      break;
    case "success":
      p.log.success(formattedMessage);
      break;
    case "warning":
      p.log.warning(formattedMessage);
      break;
    case "error":
      p.log.error(formattedMessage);
      break;
  }
}

/**
 * Show info toast
 */
export function toastInfo(message: string, title?: string): void {
  toast({ variant: "info", message, title });
}

/**
 * Show success toast
 */
export function toastSuccess(message: string, title?: string): void {
  toast({ variant: "success", message, title });
}

/**
 * Show warning toast
 */
export function toastWarning(message: string, title?: string): void {
  toast({ variant: "warning", message, title });
}

/**
 * Show error toast
 */
export function toastError(message: string | Error, title?: string): void {
  const msg = message instanceof Error ? message.message : message;
  toast({ variant: "error", message: msg, title });
}

/**
 * Show a simple message (no icon, uses clack's message)
 */
export function message(text: string): void {
  p.log.message(text);
}

/**
 * Show a step indicator
 */
export function step(text: string): void {
  p.log.step(text);
}

/**
 * Toast namespace for grouped exports
 */
export const Toast = {
  show: toast,
  info: toastInfo,
  success: toastSuccess,
  warning: toastWarning,
  error: toastError,
  message,
  step,
};

export default Toast;
