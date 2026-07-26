import { useMemo, useState } from 'react';
import api from '../../lib/api';
import type { FacultyShareLink, ScheduleRun, WorkspaceResource } from '../../hooks/useApi';
import { useFacultyShareLinks } from '../../hooks/useApi';

interface ShareLinkPanelProps {
  workspaceId: string | null;
  faculty: WorkspaceResource | null;
  activeRun: ScheduleRun | null;
}

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function linkLabel(link: FacultyShareLink) {
  return link.token.slice(0, 8);
}

export default function ShareLinkPanel({ workspaceId, faculty, activeRun }: ShareLinkPanelProps) {
  const { data: links, loading, refetch } = useFacultyShareLinks(workspaceId, faculty?.id || null);
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLink = useMemo(() => (links || []).find((link) => link.is_active), [links]);

  const generate = async () => {
    if (!workspaceId || !faculty || !activeRun) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      await api.post(`/api/v1/workspaces/${workspaceId}/faculty/${faculty.id}/share-link`, {
        schedule_run_id: activeRun.id,
        expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      });
      refetch();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Could not generate share link');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (link: FacultyShareLink) => {
    if (!workspaceId || !faculty) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/api/v1/workspaces/${workspaceId}/faculty/${faculty.id}/share-link/${link.id}`);
      refetch();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Could not revoke share link');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!activeLink) return;
    try {
      await navigator.clipboard.writeText(activeLink.share_url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Clipboard access is unavailable in this browser');
    }
  };

  if (!faculty) {
    return (
      <div className="rounded-xl border-2 border-rule bg-paper-raised p-inset-standard text-sm text-mono-grey">
        Select a faculty member to manage share links.
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-rule bg-paper-raised">
      <div className="border-b border-rule bg-on-background px-5 py-4 text-paper-raised">
        <p className="text-label-caps" style={{ fontSize: 10 }}>Share timetable</p>
        <h3 className="mt-1 text-sm font-semibold">{faculty.name}</h3>
      </div>

      <div className="space-y-5 p-5">
        {activeLink ? (
          <div className="space-y-3">
            <div>
              <p className="text-data-table text-mono-grey">Active link</p>
              <div className="mt-2 break-all rounded-lg border border-rule bg-surface-container-low px-3 py-2 text-code-snippet text-on-surface">
                {activeLink.share_url}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-data-table text-mono-grey">
              <span>Expires: {formatDate(activeLink.expires_at)}</span>
              <span className="h-1 w-1 rounded-full bg-outline-variant" />
              <span>Created: {formatDate(activeLink.created_at)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-paper-raised px-3 py-2 text-xs font-semibold text-on-surface hover:bg-accent-soft"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={() => revoke(activeLink)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error/20 bg-error-container px-3 py-2 text-xs font-semibold text-on-error-container hover:opacity-85 disabled:opacity-50"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link_off</span>
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-rule bg-surface-container-low px-4 py-5 text-sm text-mono-grey">
            No active link for this faculty timetable.
          </div>
        )}

        <div className="grid gap-3 border-t border-rule pt-5">
          <label className="text-label-caps text-on-surface-variant" style={{ fontSize: 10 }} htmlFor="share-expiry">
            Optional expiry
          </label>
          <input
            id="share-expiry"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className="academic-input w-full text-sm"
          />
          <button
            type="button"
            onClick={generate}
            disabled={busy || !activeRun}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>ios_share</span>
            {activeLink ? 'Regenerate link' : 'Generate link'}
          </button>
          {!activeRun && (
            <p className="text-data-table text-secondary">Generate a successful schedule run before sharing.</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-error/20 bg-error-container px-3 py-2 text-xs text-on-error-container">
            {error}
          </div>
        )}

        <div className="border-t border-rule pt-5">
          <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Link history</p>
          {loading ? (
            <p className="mt-3 text-sm text-mono-grey">Loading links...</p>
          ) : (links || []).length === 0 ? (
            <p className="mt-3 text-sm text-mono-grey">No links generated yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {(links || []).map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-surface-container-low px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface">Link {linkLabel(link)}</p>
                    <p className="text-data-table text-mono-grey">
                      {link.is_active ? 'Active' : 'Revoked'} · Created {formatDate(link.created_at)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${link.is_active ? 'bg-accent-soft text-primary' : 'bg-surface-container text-mono-grey'}`}>
                    {link.is_active ? 'Active' : 'Off'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
