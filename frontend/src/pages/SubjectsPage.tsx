import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShortcutHint, useShortcutAction } from '../contexts/ShortcutContext';
import { useSubjects, useTeachers, useTeacherSubjectAssignments, type Subject } from '../hooks/useApi';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

export default function SubjectsPage() {
  const { organizationId } = useAuth();
  const { data: subjects, loading, refetch } = useSubjects(organizationId);
  const { data: teachers } = useTeachers(organizationId);
  const { data: teacherSubjects, refetch: refetchTeacherSubjects } = useTeacherSubjectAssignments(organizationId);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [formName, setFormName] = useState('');
  const [formHours, setFormHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [teacherModalSubject, setTeacherModalSubject] = useState<Subject | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  const filtered = subjects?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormHours('');
    setModalOpen(true);
  };

  useEffect(() => {
    const maybeOpen = (resource?: string) => {
      const pending = resource || window.sessionStorage.getItem('slotforge:create-resource');
      if (pending === 'subject') {
        window.sessionStorage.removeItem('slotforge:create-resource');
        openCreate();
      }
    };
    const onCreate = (event: Event) => maybeOpen((event as CustomEvent<string>).detail);
    maybeOpen();
    window.addEventListener('slotforge:create-resource', onCreate);
    return () => window.removeEventListener('slotforge:create-resource', onCreate);
  }, []);

  useShortcutAction(useMemo(() => ({
    id: 'subjects.create',
    label: 'Create Subject',
    shortcut: 'c s',
    handler: openCreate,
  }), []));

  useShortcutAction(useMemo(() => ({
    id: 'subjects.search',
    label: 'Focus Subject Search',
    shortcut: '/',
    handler: () => searchRef.current?.focus(),
  }), []));

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

  const teacherById = useMemo(() => new Map((teachers || []).map(teacher => [teacher.id, teacher])), [teachers]);
  const getSubjectTeachers = (subjectId: string) =>
    teacherSubjects?.filter(row => row.subject_id === subjectId).map(row => teacherById.get(row.teacher_id)).filter(Boolean) || [];

  const openTeacherModal = (subject: Subject) => {
    setTeacherModalSubject(subject);
    setSelectedTeacherIds((teacherSubjects || [])
      .filter(row => row.subject_id === subject.id)
      .map(row => row.teacher_id));
  };

  const toggleTeacher = (teacherId: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const saveSubjectTeachers = async () => {
    if (!teacherModalSubject) return;
    setSaving(true);
    try {
      const currentTeacherIds = new Set((teacherSubjects || [])
        .filter(row => row.subject_id === teacherModalSubject.id)
        .map(row => row.teacher_id));
      const nextTeacherIds = new Set(selectedTeacherIds);
      const touchedTeacherIds = Array.from(new Set([...currentTeacherIds, ...nextTeacherIds]));

      await Promise.all(touchedTeacherIds.map(async teacherId => {
        const existingSubjects = (teacherSubjects || [])
          .filter(row => row.teacher_id === teacherId && row.subject_id !== teacherModalSubject.id)
          .map(row => row.subject_id);
        const subjectIds = nextTeacherIds.has(teacherId)
          ? [...existingSubjects, teacherModalSubject.id]
          : existingSubjects;
        await api.put(`/assignments/teacher-subjects/${teacherId}`, { subject_ids: subjectIds });
      }));

      setTeacherModalSubject(null);
      refetchTeacherSubjects();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
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
              <ShortcutHint shortcut="c s" />
            </button>
          </>
        }
      />

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-mono-grey" style={{ fontSize: 20 }}>search</span>
          <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="academic-input w-full pl-10" placeholder="Search subjects..." />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <ShortcutHint shortcut="/" />
          </div>
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
              <th className="text-left px-6 py-3 text-data-table font-semibold">Teachers</th>
              <th className="text-left px-6 py-3 text-data-table font-semibold">Status</th>
              <th className="text-left px-6 py-3 text-data-table font-semibold">ID</th>
              <th className="text-right px-6 py-3 text-data-table font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-body-sm text-mono-grey">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center">
                <span className="material-symbols-outlined text-outline-variant mb-2 block" style={{ fontSize: 36 }}>menu_book</span>
                <p className="text-body-sm text-on-surface-variant">No subjects configured</p>
              </td></tr>
            ) : filtered.map((s, idx) => {
              const assignedTeachers = getSubjectTeachers(s.id);
              return (
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {assignedTeachers.length > 0 ? assignedTeachers.slice(0, 2).map(teacher => (
                      <span key={teacher!.id} className="inline-flex items-center px-2 py-0.5 text-[10px] border border-dashed border-primary/30 text-primary rounded-full bg-accent-soft/50" style={{ fontFamily: 'var(--font-mono)' }}>
                        {teacher!.name}
                      </span>
                    )) : <span className="text-data-table text-mono-grey">—</span>}
                    {assignedTeachers.length > 2 && <span className="text-data-table text-mono-grey">+{assignedTeachers.length - 2}</span>}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={s.weekly_hours > 0 ? 'Ready' : 'Draft'} />
                </td>
                <td className="px-6 py-3 text-code-snippet text-mono-grey">{s.id.slice(0, 8)}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openTeacherModal(s)} className="p-1.5 rounded-lg hover:bg-accent-soft transition-colors" title="Teachers">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>rule</span>
                    </button>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-accent-soft transition-colors">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>edit</span>
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-error-container transition-colors">
                      <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            );})}
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

      <Modal open={!!teacherModalSubject} onClose={() => setTeacherModalSubject(null)} title={`Teachers for ${teacherModalSubject?.name || ''}`}
        maxWidth="max-w-xl"
        actions={
          <>
            <button onClick={() => setTeacherModalSubject(null)} className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors">Cancel</button>
            <button onClick={saveSubjectTeachers} disabled={saving} className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(teachers || []).map(teacher => {
            const selected = selectedTeacherIds.includes(teacher.id);
            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => toggleTeacher(teacher.id)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selected ? 'border-primary bg-accent-soft text-primary' : 'border-rule text-on-surface hover:bg-surface-container'}`}
              >
                <span>{teacher.name}</span>
                {selected && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
