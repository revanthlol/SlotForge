import Modal from './Modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onCancel}
      title={title}
      actions={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-error text-on-error text-sm font-semibold rounded-lg hover:opacity-85 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
        {error && (
          <div className="rounded-lg border border-error/20 bg-error-container px-3 py-2 text-sm text-on-error-container">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
