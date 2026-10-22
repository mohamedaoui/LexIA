import { useEffect } from "react";

export type NoticeState = { kind: "success" | "error"; text: string } | null;

/** Message de résultat d'une action ; les succès disparaissent seuls après quelques secondes. */
export function Notice({ notice, onDone }: { notice: NoticeState; onDone: () => void }) {
  useEffect(() => {
    if (notice?.kind !== "success") return;
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [notice, onDone]);

  if (!notice) return null;
  const styles =
    notice.kind === "success" ? "border-brand-100 bg-brand-50 text-brand-700" : "border-red-200 bg-red-50 text-red-700";
  return (
    <div role={notice.kind === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {notice.text}
    </div>
  );
}
