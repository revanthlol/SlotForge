import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../hooks/useApi';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';

export default function SettingsPage() {
  const { organizationId } = useAuth();
  const { data: organization, refetch } = useOrganization(organizationId);

  // Form states (backed by real API)
  const [name, setName] = useState('');
  const [schedulingMode, setSchedulingMode] = useState<'fixed_weekday' | 'day_order'>('fixed_weekday');
  const [cycleLength, setCycleLength] = useState(5);
  const [periodsPerDay, setPeriodsPerDay] = useState(6);

  // UI-only states (persisted in localStorage)
  const [strictness, setStrictness] = useState('balanced');
  const [maxSolverSeconds, setMaxSolverSeconds] = useState(30);
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Populate form from API on load
  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setSchedulingMode(organization.scheduling_mode as any || 'fixed_weekday');
      setCycleLength(organization.cycle_length || 5);
      setPeriodsPerDay(organization.periods_per_day || 6);
    }
  }, [organization]);

  // Load UI preferences on load
  useEffect(() => {
    const storedStrictness = localStorage.getItem('slotforge_strictness');
    if (storedStrictness) setStrictness(storedStrictness);

    const storedSeconds = localStorage.getItem('slotforge_max_seconds');
    if (storedSeconds) setMaxSolverSeconds(parseInt(storedSeconds, 10));

    const storedTelemetry = localStorage.getItem('slotforge_telemetry');
    if (storedTelemetry) setTelemetryEnabled(storedTelemetry === 'true');

    const storedEmail = localStorage.getItem('slotforge_email_alerts');
    if (storedEmail) setEmailAlertsEnabled(storedEmail === 'true');
  }, []);

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    setMessage(null);

    try {
      // Save backend organization fields
      await api.patch(`/organizations/${organizationId}`, {
        name,
        scheduling_mode: schedulingMode,
        cycle_length: cycleLength,
        periods_per_day: periodsPerDay,
      });

      // Save local storage preferences
      localStorage.setItem('slotforge_strictness', strictness);
      localStorage.setItem('slotforge_max_seconds', maxSolverSeconds.toString());
      localStorage.setItem('slotforge_telemetry', telemetryEnabled.toString());
      localStorage.setItem('slotforge_email_alerts', emailAlertsEnabled.toString());

      setMessage({ type: 'success', text: 'Settings updated successfully' });
      refetch();
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm('Are you sure you want to reset all engine parameters to factory defaults?')) return;
    setStrictness('balanced');
    setMaxSolverSeconds(30);
    setTelemetryEnabled(true);
    setEmailAlertsEnabled(false);
    setMessage({ type: 'success', text: 'Local solver preferences reset to defaults. Click Save to commit.' });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        breadcrumb="SYSTEM / SETTINGS"
        title="Settings"
        subtitle="Manage institutional preferences, scheduling cycle parameters, and optimization priorities"
      />

      {message && (
        <div
          className={`p-inset-compact rounded-xl text-sm border flex gap-3 ${
            message.type === 'success'
              ? 'bg-accent-soft/30 border-primary/20 text-primary'
              : 'bg-error-container/30 border-error/20 text-error'
          }`}
        >
          <span className="material-symbols-outlined shrink-0">
            {message.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Core Institutional parameters */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Institutional Identity */}
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-standard space-y-5">
            <div className="flex items-center gap-3 border-b border-rule pb-3">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>
                domain
              </span>
              <h3 className="text-headline-sm text-on-surface">Institutional Identity</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-label-caps text-on-surface-variant block" style={{ fontSize: 10 }}>
                  Institution Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="academic-input w-full"
                  placeholder="e.g. University of Science"
                />
              </div>

              <div className="space-y-2">
                <label className="text-label-caps text-on-surface-variant block" style={{ fontSize: 10 }}>
                  Scheduling Mode
                </label>
                <select
                  value={schedulingMode}
                  onChange={(e) => setSchedulingMode(e.target.value as any)}
                  className="academic-input w-full py-2"
                >
                  <option value="fixed_weekday">Fixed Weekday (Mon-Fri)</option>
                  <option value="day_order">Day Order Cycle (Day 1-N)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-label-caps text-on-surface-variant block" style={{ fontSize: 10 }}>
                  Cycle Length (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={cycleLength}
                  onChange={(e) => setCycleLength(parseInt(e.target.value, 10) || 5)}
                  className="academic-input w-full"
                />
                <span className="text-[10px] text-mono-grey block">
                  Number of active slots per schedule cycle.
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-label-caps text-on-surface-variant block" style={{ fontSize: 10 }}>
                  Periods Per Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={periodsPerDay}
                  onChange={(e) => setPeriodsPerDay(parseInt(e.target.value, 10) || 6)}
                  className="academic-input w-full"
                />
                <span className="text-[10px] text-mono-grey block">
                  Number of daily scheduling intervals.
                </span>
              </div>
            </div>
          </div>

          {/* Solver Parameters */}
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-standard space-y-5">
            <div className="flex items-center gap-3 border-b border-rule pb-3">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 22 }}>
                precision_manufacturing
              </span>
              <h3 className="text-headline-sm text-on-surface">Solver Tuning parameters</h3>
            </div>

            <div className="space-y-5">
              {/* Strictness */}
              <div className="space-y-3">
                <label className="text-label-caps text-on-surface-variant block" style={{ fontSize: 10 }}>
                  Constraint Strictness Mode
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { val: 'relaxed', label: 'Relaxed', desc: 'Permits soft overlaps for dense curricula.' },
                    { val: 'balanced', label: 'Balanced', desc: 'Standard weighting optimization (default).' },
                    { val: 'absolute', label: 'Absolute', desc: 'Strictest compliance, potential unfeasibility.' },
                  ].map((mode) => (
                    <div
                      key={mode.val}
                      onClick={() => setStrictness(mode.val)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        strictness === mode.val
                          ? 'bg-accent-soft/30 border-primary text-primary'
                          : 'bg-surface-container-low border-rule hover:border-outline-variant'
                      }`}
                    >
                      <p className="text-xs font-bold">{mode.label}</p>
                      <p className="text-[10px] text-mono-grey mt-1 leading-normal">{mode.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Max execution seconds */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-label-caps text-on-surface-variant" style={{ fontSize: 10 }}>
                    Max Solver Search Time
                  </label>
                  <span className="text-xs font-bold font-mono text-primary">{maxSolverSeconds} seconds</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={maxSolverSeconds}
                  onChange={(e) => setMaxSolverSeconds(parseInt(e.target.value, 10))}
                  className="w-full accent-primary h-1.5 bg-surface-container rounded-lg"
                />
                <span className="text-[10px] text-mono-grey block">
                  Timeout limit for the optimization engine. High values yield better results but increase latency.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry & Danger Zone */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Telemetry & Alerts */}
          <div className="bg-paper-raised border-2 border-rule rounded-xl p-inset-standard space-y-5">
            <div className="flex items-center gap-3 border-b border-rule pb-3">
              <span className="material-symbols-outlined text-mono-grey" style={{ fontSize: 22 }}>
                notifications_active
              </span>
              <h3 className="text-headline-sm text-on-surface">Telemetry & Alerts</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-on-surface">Event Telemetry</h4>
                  <p className="text-[10px] text-mono-grey mt-0.5 leading-normal">
                    Collect solver statistics for diagnostics and engine tuning.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={telemetryEnabled}
                  onChange={(e) => setTelemetryEnabled(e.target.checked)}
                  className="toggle-switch"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-on-surface">Email Notifications</h4>
                  <p className="text-[10px] text-mono-grey mt-0.5 leading-normal">
                    Notify administrators when optimization runs complete.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlertsEnabled}
                  onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                  className="toggle-switch"
                />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-paper-raised border-2 border-error/20 rounded-xl p-inset-standard space-y-4">
            <div className="flex items-center gap-3 text-error border-b border-error/10 pb-3">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                warning
              </span>
              <h3 className="text-headline-sm">Critical Operations</h3>
            </div>

            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Resetting local preferences will revert solver strictness and timeouts back to factory defaults immediately.
            </p>

            <button
              onClick={handleResetDefaults}
              className="w-full py-2 bg-error-container/20 text-error border border-error/30 text-xs font-semibold rounded-lg hover:bg-error-container/40 transition-colors"
            >
              Reset Engine Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Footer bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-paper-raised border-t-2 border-rule px-margin-page py-4 flex items-center justify-between z-40 shadow-md">
        <span className="text-xs text-mono-grey italic">
          Unsaved changes will be lost unless committed.
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2"
          >
            {saving && <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>sync</span>}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
