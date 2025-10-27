/**
 * Checklist utilities for parsing and toggling markdown checklist items
 * Supports GitHub-flavored markdown task lists: - [ ] and - [x]
 */

export interface ChecklistItem {
  text: string;
  checked: boolean;
  lineNumber: number;
  rawLine: string;
}

/**
 * Parse markdown content to extract checklist items
 * Returns array of checklist items with their line numbers and state
 */
export function parseChecklist(markdown: string): ChecklistItem[] {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const items: ChecklistItem[] = [];

  lines.forEach((line, index) => {
    // Match unchecked: - [ ] or checked: - [x] or - [X]
    const uncheckedMatch = line.match(/^(\s*)-\s+\[\s\]\s+(.+)$/);
    const checkedMatch = line.match(/^(\s*)-\s+\[[xX]\]\s+(.+)$/);

    if (uncheckedMatch) {
      items.push({
        text: uncheckedMatch[2].trim(),
        checked: false,
        lineNumber: index,
        rawLine: line,
      });
    } else if (checkedMatch) {
      items.push({
        text: checkedMatch[2].trim(),
        checked: true,
        lineNumber: index,
        rawLine: line,
      });
    }
  });

  return items;
}

/**
 * Toggle a checklist item at the specified line number
 * Converts - [ ] to - [x] or vice versa
 * Returns the updated markdown content
 */
export function toggleChecklistItem(markdown: string, lineNumber: number): string {
  if (!markdown) return markdown;

  const lines = markdown.split('\n');

  if (lineNumber < 0 || lineNumber >= lines.length) {
    return markdown;
  }

  const line = lines[lineNumber];

  // Check if line is an unchecked item
  const uncheckedMatch = line.match(/^(\s*)-\s+\[\s\]\s+(.+)$/);
  if (uncheckedMatch) {
    // Convert to checked
    lines[lineNumber] = `${uncheckedMatch[1]}- [x] ${uncheckedMatch[2]}`;
    return lines.join('\n');
  }

  // Check if line is a checked item
  const checkedMatch = line.match(/^(\s*)-\s+\[[xX]\]\s+(.+)$/);
  if (checkedMatch) {
    // Convert to unchecked
    lines[lineNumber] = `${checkedMatch[1]}- [ ] ${checkedMatch[2]}`;
    return lines.join('\n');
  }

  // Not a checklist item, return unchanged
  return markdown;
}

/**
 * Check if markdown content contains any checklist items
 */
export function hasChecklists(markdown: string): boolean {
  if (!markdown) return false;
  return /^(\s*)-\s+\[[\sxX]\]\s+.+$/m.test(markdown);
}

/**
 * Get checklist statistics
 */
export function getChecklistStats(markdown: string): { checked: number; total: number } {
  const items = parseChecklist(markdown);
  const checked = items.filter((item) => item.checked).length;
  return { checked, total: items.length };
}

/**
 * Insert a new checklist item at the end of the markdown content
 */
export function insertChecklistItem(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed) {
    return '- [ ] ';
  }

  // Add new line if content doesn't end with one
  const separator = trimmed.endsWith('\n') ? '' : '\n';
  return `${trimmed}${separator}\n- [ ] `;
}
