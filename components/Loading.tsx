export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 muted" role="status">
      <span className="spinner spinner-dark" aria-hidden /> Loading your workspace...
    </div>
  );
}
