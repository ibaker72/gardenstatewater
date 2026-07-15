/** Skeleton shown while any portal page loads — it never feels broken. */
export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-aqua-50 via-white to-white pb-10">
      <div className="mx-auto w-full max-w-lg space-y-4 px-5 pt-6" aria-busy="true" aria-label="Loading">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-aqua-100" />
          <div className="h-5 w-44 animate-pulse rounded-lg bg-aqua-100" />
        </div>
        <div className="h-9 w-48 animate-pulse rounded-xl bg-aqua-100" />
        {[36, 44, 28].map((h, i) => (
          <div
            key={i}
            className="animate-pulse rounded-3xl border border-aqua-100 bg-white p-5 shadow-lg shadow-aqua-100/40"
          >
            <div className="h-4 w-32 rounded bg-aqua-50" />
            <div className={`mt-3 rounded-2xl bg-aqua-50`} style={{ height: h * 4 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
