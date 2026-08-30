import type { ReactNode } from "react";

export function PickerSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div className="modal-card picker-sheet">
        <header className="picker-head">
          <h2 id="picker-title">{title}</h2>
          <button type="button" className="text-link" onClick={onClose}>
            Done
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
