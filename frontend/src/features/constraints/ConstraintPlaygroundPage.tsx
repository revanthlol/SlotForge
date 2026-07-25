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
  const hardRules = useMemo(() => rules.filter((r) => r.rule_type === 'hard'), [rules]);
  const softRules = useMemo(() => rules.filter((r) => r.rule_type === 'soft'), [rules]);

  if (loadingWorkspace || loadingTemplates) return <div className="p-8 text-sm text-on-surface-variant">Loading constraint playground…</div>;
  if (!workspaceId) return <div className="rounded-xl border-2 border-rule bg-paper-raised p-8 text-on-surface-variant">Create a workspace before configuring rules.</div>;

  const containerVariants = {
    animate: { transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  return (
    <div>
      <PageHeader
        title="Constraint Playground"
        subtitle="Configure scheduling rules for this workspace and preview their impact before saving."
        actions={<span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-primary tabular-nums">{rules.length} active rules</span>}
      />
      {rulesError && <div className="mb-5 rounded-lg border border-error/30 bg-error-container/30 px-4 py-3 text-sm text-error">Could not load workspace rules.</div>}
      {error && <div className="mb-5 rounded-lg border border-error/30 bg-error-container/30 px-4 py-3 text-sm text-error">{error}</div>}

      <section className="mb-8 rounded-xl border-2 border-rule bg-paper-raised p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">Active rules</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Disabled rules stay saved but are skipped by the solver.</p>
          </div>
        </div>
        {loadingRules ? (
          <p className="text-sm text-on-surface-variant">Loading rules…</p>
        ) : rules.length === 0 ? (
          <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">No rules yet. Add one from the template gallery below.</p>
        ) : (
          <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-3">
            {[...hardRules, ...softRules].map((rule) => (
              <motion.div
                key={rule.id}
                variants={itemVariants}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-rule bg-paper px-4 py-3.5 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => mutations.update.mutate({ id: rule.id, enabled: !rule.enabled })}
                  className={`relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${rule.enabled ? 'bg-primary' : 'bg-surface-container'}`}
                  aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ${rule.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
                <span className="min-w-48 flex-1 text-sm font-semibold text-on-surface">{rule.name}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${rule.rule_type === 'hard' ? 'bg-error-container text-error' : 'bg-accent-soft text-primary'}`}>
                  {rule.rule_type}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(rule)}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveId(rule.id)}
                  className="text-sm font-semibold text-error hover:underline"
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-headline-sm font-bold text-on-surface">Template gallery</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Start from a built-in rule, then tune its parameters.</p>
        </div>
        <motion.div variants={containerVariants} initial="initial" animate="animate" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <motion.button
              key={template.key}
              variants={itemVariants}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => openCreate(template)}
              className="text-left rounded-xl border-2 border-rule bg-paper-raised p-5 transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="material-symbols-outlined text-primary">{template.type === 'hard' ? 'lock' : 'tune'}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${template.type === 'hard' ? 'bg-error-container text-error' : 'bg-accent-soft text-primary'}`}>
                  {template.type}
                </span>
              </div>
              <h3 className="font-semibold text-on-surface">{template.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{template.description}</p>
            </motion.button>
          ))}
        </motion.div>
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

