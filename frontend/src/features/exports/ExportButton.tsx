import { useCallback, useEffect, useRef, useState } from 'react';
import { exportAsDOCX } from './exportDOCX';
import { exportAsCSV, exportAsExcel } from './exportExcel';
import { exportToGoogleDocs } from './exportGoogleDocs';
import { exportAsHTML } from './exportHTML';
import { exportAsICal } from './exportICal';
import { exportAsPDF } from './exportPDF';
import type { ExportFormat, ExportTimetableData } from './types';

interface ExportButtonProps {
  data: ExportTimetableData | null;
  pdfOnly?: boolean;
  align?: 'left' | 'right';
}

const allOptions: Array<{ format: ExportFormat; label: string; icon: string }> = [
  { format: 'html', label: 'Download as HTML', icon: 'html' },
  { format: 'pdf', label: 'Download as PDF', icon: 'picture_as_pdf' },
  { format: 'xlsx', label: 'Download as Excel', icon: 'table' },
  { format: 'csv', label: 'Download as CSV', icon: 'csv' },
  { format: 'google_docs', label: 'Export to Google Docs', icon: 'docs' },
  { format: 'docx', label: 'Export to Word', icon: 'description' },
  { format: 'ics', label: 'Export as iCal', icon: 'calendar_add_on' },
];

export default function ExportButton({ data, pdfOnly = false, align = 'right' }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const options = pdfOnly ? allOptions.filter((option) => option.format === 'pdf') : allOptions;

  const updateMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 256;
    const rawLeft = align === 'right' ? rect.right - menuWidth : rect.left;
    const left = Math.min(Math.max(12, rawLeft), window.innerWidth - menuWidth - 12);
    setMenuPosition({ top: rect.bottom + 8, left });
  }, [align]);

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const runExport = async (format: ExportFormat) => {
    if (!data) return;
    setBusyFormat(format);
    setError(null);
    try {
      if (format === 'html') exportAsHTML(data);
      if (format === 'pdf') await exportAsPDF(data);
      if (format === 'xlsx') exportAsExcel(data);
      if (format === 'csv') exportAsCSV(data);
      if (format === 'google_docs') await exportToGoogleDocs(data);
      if (format === 'docx') await exportAsDOCX(data);
      if (format === 'ics') exportAsICal(data);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusyFormat(null);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (pdfOnly) {
            runExport('pdf');
            return;
          }
          updateMenuPosition();
          setOpen((current) => !current);
        }}
        disabled={!data || Boolean(busyFormat)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{pdfOnly ? 'download' : 'ios_share'}</span>
        {busyFormat ? 'Exporting...' : pdfOnly ? 'Download PDF' : 'Export'}
        {!pdfOnly && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>}
      </button>

      {open && (
        <div
          ref={menuRef}
          className="fixed z-[1000] w-64 overflow-hidden rounded-xl border-2 border-rule bg-paper-raised shadow-2xl"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {options.map((option) => (
            <button
              key={option.format}
              type="button"
              onClick={() => runExport(option.format)}
              disabled={Boolean(busyFormat)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-on-surface hover:bg-accent-soft disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>{option.icon}</span>
              {option.label}
            </button>
          ))}
          {error && (
            <div className="border-t border-rule bg-error-container px-4 py-3 text-xs text-on-error-container">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
