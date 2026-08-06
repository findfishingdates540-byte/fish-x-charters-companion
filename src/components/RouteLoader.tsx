export function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-border"
          style={{ borderTopColor: "var(--sandy-gold)" }}
        />
        <p className="text-label-caps text-on-deep-muted">Casting off…</p>
      </div>
    </div>
  );
}

export default RouteLoader;
