import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubjects, type Subject } from '../hooks/useApi';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

export default function SubjectsPage() {
  const { organizationId } = useAuth();
  const { data: subjects, loading, refetch } = useSubjects(organizationId);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [formName, setFormName] = useState('');
  const [formHours, setFormHours] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = subjects?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormHours('');
    setModalOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setFormName(s.name);
    setFormHours(String(s.weekly_hours));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formHours || !organizationId) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/subjects/${editing.id}`, { name: formName, weekly_hours: parseInt(formHours) });
      } else {
        await api.post('/subjects', { organization_id: organizationId, name: formName, weekly_hours: parseInt(formHours) });
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject?')) return;
    await api.delete(`/subjects/${id}`);
    refetch();
  };

  return (
    <div>
      <PageHeader
        breadcrumb="RESOURCES / SUBJECTS"
        title="Subject Resources"
        subtitle="Configure academic subjects, weekly periods, and course requirements"
        actions={
          <>
            <button className="px-4 py-2 border-2 border-rule text-on-surface text-sm font-semibold rounded-lg hover:bg-accent-soft transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>
              Import CSV
            </button>
            <button
              onClick={openCreate}
              className="px-4 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              New Subject
            </button>
          </>
        }
      />

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-mono-grey" style={{ fontSize: 20 }}>search</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="academic-input w-full pl-10" placeholder="Search subjects..." />
        </div>
      </div>

      {/* Table */}
      <div className="bg-paper-raised border-2 border-rule rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-on-background text-paper-raised">
              <th className="text-left px-6 py-3 text-data-table font-semibold w-16">#</th>
              <th className="text-left px-6 py-3 text-data-table font-semibold">Subject Name</th>
              <th className="text-left px-6 py-3 text-data-table font-semibold">Weekly Periods</th>
              <th className="text-left px-6 py-3 text-data-table font-semibold">Status</th>
              <th className="text-left px-6 py-3 text-data-table font-semibold">ID</th>
              <th className="text-right px-6 py-3 text-data-table font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-body-sm text-mono-grey">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center">
                <span className="material-symbols-outlined text-outline-variant mb-2 block" style={{ fontSize: 36 }}>menu_book</span>
                <p className="text-body-sm text-on-surface-variant">No subjects configured</p>
              </td></tr>
            ) : filtered.map((s, idx) => (
              <tr key={s.id} className="hover:bg-surface-bright transition-colors group">
                <td className="px-6 py-3 text-data-table text-mono-grey">{idx + 1}</td>
                <td className="px-6 py-3">
                  <span className="text-sm font-medium text-on-surface">{s.name}</span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((s.weekly_hours / 10) * 100, 100)}%` }} />
                    </div>
                    <span className="text-data-table text-on-surface font-medium">{s.weekly_hours}h</span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={s.weekly_hours > 0 ? 'Ready' : 'Draft'} />
                </td>
                <td className="px-6 py-3 text-code-snippet text-mono-grey">{s.id.slice(0, 8)}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-accent-soft transition-colors">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>edit</span>
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-error-container transition-colors">
                      <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-rule bg-surface-container-low">
          <p className="text-data-table text-mono-grey">{filtered.length} subject{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Subject' : 'New Subject'}
        actions={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving || !formName.trim()} className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Subject Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="academic-input w-full" placeholder="Mathematics" autoFocus />
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Weekly Hours</label>
            <input type="number" value={formHours} onChange={(e) => setFormHours(e.target.value)} className="academic-input w-full" placeholder="5" min={1} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
