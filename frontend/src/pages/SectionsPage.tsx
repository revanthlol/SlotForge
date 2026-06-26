import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSections, type Section } from '../hooks/useApi';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';

export default function SectionsPage() {
  const { organizationId } = useAuth();
  const { data: sections, loading, refetch } = useSections(organizationId);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [formName, setFormName] = useState('');
  const [formSize, setFormSize] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = sections?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreate = () => { setEditing(null); setFormName(''); setFormSize(''); setModalOpen(true); };
  const openEdit = (s: Section) => { setEditing(s); setFormName(s.name); setFormSize(String(s.size)); setModalOpen(true); };

  const handleSave = async () => {
    if (!formName.trim() || !formSize || !organizationId) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/sections/${editing.id}`, { name: formName, size: parseInt(formSize) });
      } else {
        await api.post('/sections', { organization_id: organizationId, name: formName, size: parseInt(formSize) });
      }
      setModalOpen(false);
      refetch();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this section?')) return;
    await api.delete(`/sections/${id}`);
    refetch();
  };

  return (
    <div>
      <PageHeader
        breadcrumb="RESOURCES / SECTIONS"
        title="Class Sections"
        subtitle="Manage student sections and class sizes for scheduling"
        actions={
          <button onClick={openCreate}
            className="px-4 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add Section
          </button>
        }
      />

      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-mono-grey" style={{ fontSize: 20 }}>search</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="academic-input w-full pl-10" placeholder="Search sections..." />
        </div>
      </div>

      <div className="bg-paper-raised border-2 border-rule rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 bg-on-background text-paper-raised px-6 py-3">
          <div className="col-span-1 text-data-table font-semibold">#</div>
          <div className="col-span-4 text-data-table font-semibold">Section Name</div>
          <div className="col-span-3 text-data-table font-semibold">Class Size</div>
          <div className="col-span-2 text-data-table font-semibold">ID</div>
          <div className="col-span-2 text-data-table font-semibold text-right">Actions</div>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-body-sm text-mono-grey">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="material-symbols-outlined text-outline-variant mb-2" style={{ fontSize: 36 }}>groups</span>
            <p className="text-body-sm text-on-surface-variant">No sections configured</p>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {filtered.map((s, idx) => (
              <div key={s.id} className="grid grid-cols-12 px-6 py-3 items-center hover:bg-surface-bright transition-colors group">
                <div className="col-span-1 text-data-table text-mono-grey">{idx + 1}</div>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-signal-soft flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary">{s.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-on-surface">{s.name}</span>
                </div>
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min((s.size / 100) * 100, 100)}%` }} />
                  </div>
                  <span className="text-data-table text-on-surface font-medium">{s.size} students</span>
                </div>
                <div className="col-span-2 text-code-snippet text-mono-grey">{s.id.slice(0, 8)}</div>
                <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-accent-soft transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>edit</span>
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-error-container transition-colors">
                    <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="px-6 py-3 border-t border-rule bg-surface-container-low">
          <p className="text-data-table text-mono-grey">{filtered.length} section{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Section' : 'Add Section'}
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
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Section Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="academic-input w-full" placeholder="Section A" autoFocus />
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Class Size</label>
            <input type="number" value={formSize} onChange={(e) => setFormSize(e.target.value)} className="academic-input w-full" placeholder="60" min={1} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
