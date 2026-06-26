import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, actions, maxWidth = 'max-w-lg' }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[100]">
      <DialogBackdrop
        className="fixed inset-0 bg-on-background/30 backdrop-blur-sm transition-opacity"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={`${maxWidth} w-full bg-paper-raised rounded-xl border-2 border-rule shadow-2xl transform transition-all`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
            <DialogTitle
              className="text-headline-sm text-on-surface"
            >
              {title}
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent-soft transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
                close
              </span>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {children}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-rule bg-surface-container-low rounded-b-xl">
              {actions}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
