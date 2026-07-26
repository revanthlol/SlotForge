import { renderFullHTMLDocument } from './TimetableHTMLTemplate';
import type { ExportTimetableData } from './types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Identity Services failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services failed to load'));
    document.head.appendChild(script);
  });
}

function getGoogleAccessToken(clientId: string) {
  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Google authorization did not return an access token'));
          return;
        }
        resolve(response.access_token);
      },
    });
    if (!tokenClient) {
      reject(new Error('Google Identity Services is unavailable'));
      return;
    }
    tokenClient.requestAccessToken();
  });
}

export async function exportToGoogleDocs(data: ExportTimetableData) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google Docs export needs VITE_GOOGLE_CLIENT_ID configured');
  }

  await loadGoogleIdentityScript();
  const accessToken = await getGoogleAccessToken(clientId);
  const boundary = `slotforge-${Date.now()}`;
  const metadata = {
    name: `${data.meta.filename}.html`,
    mimeType: 'application/vnd.google-apps.document',
  };
  const html = renderFullHTMLDocument(data);
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
    `--${boundary}--`,
  ].join('\r\n');

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google Docs export failed with status ${response.status}`);
  }
  const result = await response.json();
  window.open(`https://docs.google.com/document/d/${result.id}/edit`, '_blank', 'noopener,noreferrer');
}
