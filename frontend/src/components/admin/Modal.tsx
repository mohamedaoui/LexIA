import { useEffect, useRef, type ReactNode } from "react";

/** Fenêtre modale : fermeture par Échap ou clic sur le fond, focus placé dans le formulaire. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 cursor-default" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="modal-title" className="mb-4 text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
