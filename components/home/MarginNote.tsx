/** Basecamp-style highlighter aside. One per section, never on headings. */
export function MarginNote({ children, className = "" }: { children: string; className?: string }) {
  return <span className={`pathlab-note text-sm ${className}`}>{children}</span>;
}
