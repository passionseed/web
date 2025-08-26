/**
 * Keyboard navigation utilities for MapViewer
 */

import { isEditable } from "@/lib/dom/is-editable";

/**
 * Check if a keyboard event should be handled
 */
export function shouldHandleKeyboardEvent(event: KeyboardEvent): boolean {
  // Do not handle when user is typing or during IME composition
  if (event.isComposing) return false;
  if (isEditable(event.target)) return false;

  return true;
}

/**
 * Check if event is a navigation key (Tab)
 */
export function isNavigationKey(event: KeyboardEvent): boolean {
  const key = event.key?.toLowerCase?.() ?? event.key;
  return key === "tab" && !event.metaKey && !event.ctrlKey && !event.altKey;
}

/**
 * Check if event is deselect key (Escape)
 */
export function isDeselectKey(event: KeyboardEvent): boolean {
  const key = event.key?.toLowerCase?.() ?? event.key;
  return key === "escape";
}

/**
 * Check if event is toggle navigation key (Cmd/Ctrl+K)
 */
export function isToggleNavigationKey(event: KeyboardEvent): boolean {
  const key = event.key?.toLowerCase?.() ?? event.key;
  return (event.metaKey || event.ctrlKey) && key === "k";
}

/**
 * Check if event is a plain character key without modifier
 */
export function isPlainCharacterKey(event: KeyboardEvent): boolean {
  const key = event.key?.toLowerCase?.() ?? event.key;
  const hasModifier = event.metaKey || event.ctrlKey || event.altKey;
  
  // Do not intercept plain character keys like "f" without a modifier
  return key && key.length === 1 && !hasModifier;
}

/**
 * Get navigation direction from keyboard event
 */
export function getNavigationDirection(event: KeyboardEvent): 1 | -1 {
  return event.shiftKey ? -1 : 1;
}