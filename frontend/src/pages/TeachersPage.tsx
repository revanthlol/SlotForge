import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeachers, useConstraints, type Teacher } from '../hooks/useApi';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';

export default function TeachersPage() {
  const { organizationId } = useAuth();
  const { data: teachers, loading, refetch } = useTeachers(organizationId);
  const { data: constraints } = useConstraints(organizationId);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = teachers?.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getTeacherConstraints = (teacherId: string) =>
    constraints?.filter(c =>
      c.payload && (c.payload as Record<string, unknown>).teacher_id === teacherId
    ) || [];

  const openCreate = () => {
    setEditingTeacher(null);
    setFormName('');
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormName(t.name);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !organizationId) return;
    setSaving(true);
    try {
      if (editingTeacher) {
        await api.put(`/teachers/${editingTeacher.id}`, { name: formName });
      } else {
        await api.post('/teachers', { organization_id: organizationId, name: formName });
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
    if (!confirm('Delete this teacher?')) return;
    await api.delete(`/teachers/${id}`);
    refetch();
  };

  return (
    <div>
      <PageHeader
        breadcrumb="RESOURCES / TEACHERS"
        title="Faculty Roster"
        subtitle="Manage teaching staff, view load distribution and active constraints"
        actions={
          <button
            onClick={openCreate}
            className="px-4 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add Teacher
          </button>
        }
      />

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-mono-grey" style={{ fontSize: 20 }}>
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="academic-input w-full pl-10"
            placeholder="Search teachers..."
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-paper-raised border-2 border-rule rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 bg-on-background text-paper-raised px-6 py-3">
          <div className="col-span-1 text-data-table font-semibold">#</div>
          <div className="col-span-4 text-data-table font-semibold">Teacher Name</div>
          <div className="col-span-3 text-data-table font-semibold">Active Constraints</div>
          <div className="col-span-2 text-data-table font-semibold">ID</div>
          <div className="col-span-2 text-data-table font-semibold text-right">Actions</div>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="px-6 py-12 text-center text-body-sm text-mono-grey">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="material-symbols-outlined text-outline-variant mb-2" style={{ fontSize: 36 }}>school</span>
            <p className="text-body-sm text-on-surface-variant">No teachers found</p>
            <p className="text-data-table text-mono-grey mt-1">Add your first teacher to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {filtered.map((t, idx) => {
              const tc = getTeacherConstraints(t.id);
              return (
                <div
                  key={t.id}
                  className="grid grid-cols-12 px-6 py-3 items-center hover:bg-surface-bright transition-colors group"
                >
                  <div className="col-span-1 text-data-table text-mono-grey">{idx + 1}</div>
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {t.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-on-surface">{t.name}</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5 flex-wrap">
                    {tc.length > 0 ? tc.map(c => (
                      <span
                        key={c.id}
                        className="inline-flex items-center px-2 py-0.5 text-[10px] border border-dashed border-primary/30 text-primary rounded-full bg-accent-soft/50"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {c.constraint_type}
                      </span>
                    )) : (
                      <span className="text-data-table text-mono-grey">—</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-code-snippet text-mono-grey">{t.id.slice(0, 8)}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 rounded-lg hover:bg-accent-soft transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg hover:bg-error-container transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-rule bg-surface-container-low flex items-center justify-between">
          <p className="text-data-table text-mono-grey">
            {filtered.length} teacher{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeacher ? 'Edit Teacher' : 'Add Teacher'}
        actions={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingTeacher ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div>
          <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>
            Teacher Name
          </label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="academic-input w-full"
            placeholder="Dr. Jane Smith"
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}
