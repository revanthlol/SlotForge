import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { exportCSS, renderTimetableBody } from './TimetableHTMLTemplate';
import type { ExportTimetableData } from './types';
import { cleanFilename } from './utils';

export async function exportAsPDF(data: ExportTimetableData) {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.background = '#fff';
  host.innerHTML = `<style>${exportCSS}</style>${renderTimetableBody(data)}`;
  document.body.appendChild(host);

  try {
    await document.fonts?.ready;
    const element = host.querySelector('#slotforge-export-page') as HTMLElement;
    const canvas = await html2canvas(element, {
      scale: 1.25,
      backgroundColor: '#fffdf8',
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageContentHeight = pageHeight - margin * 2;
    const imgData = canvas.toDataURL('image/jpeg', 0.82);

    let remainingHeight = imgHeight;
    let y = margin;
    while (remainingHeight > 0) {
      pdf.addImage(imgData, 'JPEG', margin, y, imgWidth, imgHeight, undefined, 'FAST');
      remainingHeight -= pageContentHeight;
      if (remainingHeight > 0) {
        pdf.addPage();
        y -= pageContentHeight;
      }
    }

    pdf.save(`${cleanFilename(data.meta.filename)}.pdf`);
  } finally {
    host.remove();
  }
}
