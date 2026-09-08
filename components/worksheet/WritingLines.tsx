export function WritingLines({ count = 2 }: { count?: number }) {
  return (
    <div className="mt-3 space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-px w-full bg-stone-900/12" />
      ))}
    </div>
  );
}
