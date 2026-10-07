export default function Pill({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "info" | "ok" | "warn" | "bad";
  children: React.ReactNode;
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
