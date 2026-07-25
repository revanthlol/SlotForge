import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, actions, maxWidth = 'max-w-lg' }: ModalProps) {
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tag = target.tagName.toLowerCase();
    if (target.isContentEditable || tag === 'textarea' || tag === 'select') return;

    const primaryButton = actionsRef.current?.querySelector<HTMLButtonElement>(
      '[data-modal-primary="true"]:not(:disabled)'
    );
    const fallbackButtons = Array.from(
      actionsRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []
    );
    const button = primaryButton || fallbackButtons.at(-1);
    if (!button) return;

    event.preventDefault();
    button.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onClose={onClose} static className="relative z-[100]">
          <DialogBackdrop
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-on-background/40 backdrop-blur-sm transition-opacity"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel
              className={`${maxWidth} w-full bg-paper-raised rounded-xl border-2 border-rule shadow-2xl overflow-hidden`}
              onKeyDown={handleKeyDown}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
              >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
                <DialogTitle
                  className="text-headline-sm text-on-surface font-bold"
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
                <div ref={actionsRef} className="flex items-center justify-end gap-3 px-6 py-4 border-t border-rule bg-surface-container-low rounded-b-xl">
                  {actions}
                </div>
              )}
              </motion.div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

