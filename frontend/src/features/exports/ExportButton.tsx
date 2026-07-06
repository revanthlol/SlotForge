import { useState } from 'react';
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
  const options = pdfOnly ? allOptions.filter((option) => option.format === 'pdf') : allOptions;

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
        type="button"
        onClick={() => {
          if (pdfOnly) {
            runExport('pdf');
            return;
          }
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
          className={[
            'absolute z-50 mt-2 w-64 overflow-hidden rounded-xl border-2 border-rule bg-paper-raised shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
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
