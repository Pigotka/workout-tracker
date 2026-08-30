export function Confirm({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal-card">
        <h2 id="confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
