/** Admin-wide loading skeleton (dark-theme aware). */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-4 h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-navy-800" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-navy-800/60" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-navy-800/60" />
    </div>
  );
}
