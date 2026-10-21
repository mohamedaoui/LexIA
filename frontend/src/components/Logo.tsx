export function Logo({ tagline }: { tagline?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0L7 7Zm10 0-3 7a3 3 0 0 0 6 0l-3-7ZM8 21h8" />
        </svg>
      </div>
      <div>
        <div className="text-xl font-bold leading-none text-slate-900">LexIA</div>
        {tagline && <div className="mt-1 text-xs text-slate-500">{tagline}</div>}
      </div>
    </div>
  );
}
