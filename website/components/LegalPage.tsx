export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-extrabold text-accent">{title}</h1>
      <div className="mt-1 text-sm text-muted">{updated}</div>
      <div className="legal mt-6">{children}</div>
    </div>
  );
}
