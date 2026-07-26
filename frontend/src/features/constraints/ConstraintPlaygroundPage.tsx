import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useWorkspaces } from '../../lib/api/hooks/useWorkspaces';
import { useResources } from '../../lib/api/hooks/useResources';
import api from '../../lib/api';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConstraintTemplates, useConstraints, useConstraintMutations, type ConstraintTemplate, type ConstraintRule, type PreviewResult } from './hooks/useConstraints';

const inputClass = 'w-full rounded-lg border-2 border-rule bg-paper px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';

export default function ConstraintPlaygroundPage() {
  const { data: workspaces, isLoading: loadingWorkspace } = useWorkspaces();
  const workspace = workspaces?.[0];
  const workspaceId = workspace?.id || null;
  const { data: templates = [], isLoading: loadingTemplates } = useConstraintTemplates();
  const { data: rules = [], isLoading: loadingRules, error: rulesError } = useConstraints(workspaceId);
  const { data: resources = [] } = useResources(workspaceId);
  const mutations = useConstraintMutations(workspaceId);
  const [selected, setSelected] = useState<ConstraintTemplate | null>(null);
  const [editing, setEditing] = useState<ConstraintRule | null>(null);
  const [parameters, setParameters] = useState<Record<string, unknown>>({});
  const [penalty, setPenalty] = useState<number | ''>('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const openCreate = (template: ConstraintTemplate) => {
    setEditing(null); setSelected(template); setPreview(null); setError(null);
    setParameters(Object.fromEntries(template.parameters.map((p) => [p.key, p.default ?? ''])));
    const defaultPenalty = template.parameters.find((p) => p.key === 'penalty')?.default;
    setPenalty(typeof defaultPenalty === 'number' ? defaultPenalty : '');
  };
  const openEdit = (rule: ConstraintRule) => {
    const template = templates.find((item) => item.key === rule.template_key);
    if (!template) return;
    setEditing(rule); setSelected(template); setPreview(null); setError(null); setParameters(rule.parameters); setPenalty(rule.penalty ?? '');
  };
  const closeModal = () => { if (!mutations.create.isPending && !mutations.update.isPending && !previewing) setSelected(null); };
  const save = async () => {
    if (!workspaceId || !selected) return;
    setError(null);
    try {
      const payload = { template_key: selected.key, parameters: { ...parameters, ...(penalty !== '' ? { penalty } : {}) }, priority: editing?.priority ?? 1, penalty: penalty === '' ? null : Number(penalty), enabled: editing?.enabled ?? true };
      if (editing) await mutations.update.mutateAsync({ id: editing.id, parameters: payload.parameters, penalty: payload.penalty, priority: payload.priority });
      else await mutations.create.mutateAsync(payload);
      setSelected(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save rule'); }
  };
  const runPreview = async () => {
    if (!workspaceId || !selected) return;
    setPreviewing(true); setError(null);
    try { setPreview((await api.post<PreviewResult>(`/api/v1/workspaces/${workspaceId}/constraints/preview`, { template_key: selected.key, parameters })).data); }
    catch (err) { setError(err instanceof Error ? err.message : 'Preview failed'); }
    finally { setPreviewing(false); }
  };
  const activeRules = useMemo(() => rules.filter((rule) => rule.enabled), [rules]);
  const groupedRules = useMemo(() => {
    const groups = new Map<string, { key: string; template: ConstraintTemplate | undefined; rules: ConstraintRule[] }>();
    rules.forEach((rule) => {
      const key = rule.template_key || rule.name;
      const current = groups.get(key) || { key, template: templates.find((item) => item.key === rule.template_key), rules: [] };
      current.rules.push(rule);
      groups.set(key, current);
    });
    return [...groups.values()].sort((a, b) => {
      const typeOrder = (a.rules[0]?.rule_type === 'hard' ? 0 : 1) - (b.rules[0]?.rule_type === 'hard' ? 0 : 1);
      return typeOrder || (a.template?.name || a.rules[0]?.name || '').localeCompare(b.template?.name || b.rules[0]?.name || '');
    });
  }, [rules, templates]);

  if (loadingWorkspace || loadingTemplates) return <div className="p-8 text-sm text-on-surface-variant">Loading constraint playground…</div>;
  if (!workspaceId) return <div className="rounded-xl border-2 border-rule bg-paper-raised p-8 text-on-surface-variant">Create a workspace before configuring rules.</div>;

  return (
    <div>
      <PageHeader
        title="Constraint Playground"
        subtitle="Build a readable rule stack, test its impact, and keep the solver's non-negotiables separate from preferences."
        actions={<span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-primary tabular-nums">{activeRules.length} active · {groupedRules.length} types</span>}
      />
      {rulesError && <div className="mb-5 rounded-lg border border-error/30 bg-error-container/30 px-4 py-3 text-sm text-error">Could not load workspace rules.</div>}
      {error && <div className="mb-5 rounded-lg border border-error/30 bg-error-container/30 px-4 py-3 text-sm text-error">{error}</div>}

      <section className="mb-8 overflow-hidden rounded-2xl border-2 border-rule bg-paper-raised shadow-sm">
        <div className="grid border-b border-rule bg-surface-container-low sm:grid-cols-3">
          <RuleMetric icon="lock" label="Non-negotiable" value={String(activeRules.filter((rule) => rule.rule_type === 'hard').length)} hint="Hard rules" />
          <RuleMetric icon="tune" label="Optimization" value={String(activeRules.filter((rule) => rule.rule_type === 'soft').length)} hint="Weighted preferences" />
          <RuleMetric icon="layers" label="Rule families" value={String(groupedRules.length)} hint={`${rules.length} saved instances`} />
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-5"><p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Current configuration</p><h2 className="mt-1 text-headline-sm font-bold text-on-surface">Rule stack</h2><p className="mt-1 text-sm text-on-surface-variant">Repeated instances are grouped together. Expand a family to edit or remove an individual rule.</p></div>
        {loadingRules ? (
          <p className="text-sm text-on-surface-variant">Loading rules…</p>
        ) : rules.length === 0 ? (
          <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">No rules yet. Add one from the template gallery below.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {groupedRules.map((group) => <RuleFamily key={group.key} template={group.template} rules={group.rules} onEdit={openEdit} onRemove={setRemoveId} onToggle={(rule) => mutations.update.mutate({ id: rule.id, enabled: !rule.enabled })} />)}
          </div>
        )}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Available building blocks</p>
          <h2 className="mt-1 text-headline-sm font-bold text-on-surface">Add a rule</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Choose what the rule protects, then preview its effect before adding it to the stack.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => openCreate(template)}
              className="text-left rounded-xl border-2 border-rule bg-paper-raised p-5 transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="material-symbols-outlined text-primary">{template.type === 'hard' ? 'lock' : 'tune'}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${template.type === 'hard' ? 'bg-error-container text-error' : 'bg-accent-soft text-primary'}`}>
                  {template.type}
                </span>
              </div>
              <h3 className="font-semibold text-on-surface">{template.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{template.description}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">Configure rule <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span></p>
            </button>
          ))}
        </div>
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={closeModal}
        title={`${editing ? 'Edit' : 'Add'} rule${selected ? `: ${selected.name}` : ''}`}
        maxWidth="max-w-2xl"
        actions={
          <>
            <button type="button" onClick={closeModal} className="rounded-lg border border-rule px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button type="button" onClick={runPreview} disabled={previewing} className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-accent-soft transition-colors">
              {previewing ? 'Previewing…' : 'Preview impact'}
            </button>
            <button type="button" onClick={save} disabled={mutations.create.isPending || mutations.update.isPending} data-modal-primary="true" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container transition-colors">
              {editing ? 'Save changes' : 'Add rule'}
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">{selected.description}</p>
            {selected.parameters.map((param) => (
              <label key={param.key} className="block text-sm font-semibold text-on-surface">
                {param.label}
                <>
                  {param.type === 'resource_picker' ? (
                    <select className={inputClass} value={String(parameters[param.key] ?? '')} onChange={(event) => setParameters({ ...parameters, [param.key]: event.target.value })}>
                      <option value="">Select a resource</option>
                      {resources.filter((r) => r.resource_type === 'teacher').map((resource) => (
                        <option key={resource.id} value={resource.id}>{resource.name}</option>
                      ))}
                    </select>
                  ) : param.type === 'day_picker' ? (
                    <select className={inputClass} value={String(parameters[param.key] ?? '')} onChange={(event) => setParameters({ ...parameters, [param.key]: event.target.value })}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <option key={day}>{day}</option>
                      ))}
                    </select>
                  ) : (
                    <input className={inputClass} type={param.type === 'int' ? 'number' : 'text'} value={String(parameters[param.key] ?? '')} onChange={(event) => setParameters({ ...parameters, [param.key]: param.type === 'int' ? Number(event.target.value) : event.target.value })} />
                  )}
                </>
              </label>
            ))}
            {preview && (
              <div className={`rounded-lg border p-4 text-sm ${preview.infeasibility_risk ? 'border-error/40 bg-error-container/20' : 'border-primary/30 bg-accent-soft/40'}`}>
                <p className="font-semibold">{preview.summary}</p>
                <p className="mt-1 text-on-surface-variant">{preview.impacted_assignments_count} existing assignment(s) affected{preview.infeasibility_risk ? '; hard-rule infeasibility risk detected.' : '.'}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmModal
        open={Boolean(removeId)}
        title="Remove constraint rule?"
        message="This rule will be deleted from the workspace and no longer applied by the solver."
        onCancel={() => setRemoveId(null)}
        onConfirm={async () => { if (removeId) await mutations.remove.mutateAsync(removeId); setRemoveId(null); }}
        loading={mutations.remove.isPending}
      />
    </div>
  );
}

function RuleMetric({ icon, label, value, hint }: { icon: string; label: string; value: string; hint: string }) {
  return <div className="flex items-center gap-3 border-b border-rule p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-rule bg-paper-raised text-primary"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-mono-grey">{label}</p><div className="mt-0.5 flex items-baseline gap-2"><span className="text-xl font-black text-on-surface tabular-nums">{value}</span><span className="text-xs text-on-surface-variant">{hint}</span></div></div></div>;
}

function RuleFamily({ template, rules, onEdit, onRemove, onToggle }: { template?: ConstraintTemplate; rules: ConstraintRule[]; onEdit: (rule: ConstraintRule) => void; onRemove: (id: string) => void; onToggle: (rule: ConstraintRule) => void }) {
  const [expanded, setExpanded] = useState(false);
  const first = rules[0];
  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const hard = first?.rule_type === 'hard';
  const title = template?.name || first?.name || 'Rule family';
  return <article className={`overflow-hidden rounded-xl border-2 transition-colors ${enabledCount ? 'border-rule bg-paper' : 'border-dashed border-rule bg-surface-container-low/50'}`}>
    <div className="p-4">
      <div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hard ? 'bg-error-container/60 text-error' : 'bg-accent-soft text-primary'}`}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>{hard ? 'lock' : 'tune'}</span></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-on-surface">{title}</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${hard ? 'bg-error-container text-error' : 'bg-accent-soft text-primary'}`}>{hard ? 'Must hold' : 'Preference'}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant">{template?.description || 'A configured scheduling rule in this workspace.'}</p></div></div>
      <div className="mt-4 flex items-center justify-between border-t border-rule pt-3"><p className="text-xs font-semibold text-on-surface-variant"><span className="text-on-surface">{enabledCount}/{rules.length}</span> active instance{rules.length === 1 ? '' : 's'}</p><button type="button" onClick={() => setExpanded((current) => !current)} className="inline-flex items-center gap-1 text-xs font-bold text-primary">{expanded ? 'Hide instances' : 'Manage instances'}<span className={`material-symbols-outlined transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ fontSize: 16 }}>expand_more</span></button></div>
    </div>
    {expanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-rule bg-surface-container-low p-3"><div className="space-y-2">{rules.map((rule, index) => <div key={rule.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-rule bg-paper-raised px-3 py-2.5"><button type="button" onClick={() => onToggle(rule)} aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${title} instance ${index + 1}`} className={`relative flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 ${rule.enabled ? 'bg-primary' : 'bg-surface-container-high'}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${rule.enabled ? 'translate-x-4' : ''}`} /></button><span className="min-w-0 flex-1 truncate text-xs font-semibold text-on-surface">{rules.length > 1 ? `${title} ${index + 1}` : title}</span>{rule.penalty != null && <span className="text-[10px] text-mono-grey">Weight {rule.penalty}</span>}<button type="button" onClick={() => onEdit(rule)} className="rounded p-1 text-primary hover:bg-accent-soft" aria-label={`Edit ${title}`}><span className="material-symbols-outlined" style={{ fontSize: 17 }}>edit</span></button><button type="button" onClick={() => onRemove(rule.id)} className="rounded p-1 text-error hover:bg-error-container/40" aria-label={`Remove ${title}`}><span className="material-symbols-outlined" style={{ fontSize: 17 }}>delete</span></button></div>)}</div></motion.div>}
  </article>;
}
