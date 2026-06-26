import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShortcutHint, useShortcutAction } from '../contexts/ShortcutContext';
import {
  useSectionSubjectTeacherAssignments,
  useSections,
  useSubjects,
  useTeachers,
  useTeacherSubjectAssignments,
  type Section,
} from '../hooks/useApi';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';

export default function SectionsPage() {
  const { organizationId } = useAuth();
  const { data: sections, loading, refetch } = useSections(organizationId);
  const { data: teachers, refetch: refetchTeachers } = useTeachers(organizationId);
  const { data: subjects } = useSubjects(organizationId);
  const { data: teacherSubjects, refetch: refetchTeacherSubjects } = useTeacherSubjectAssignments(organizationId);
  const { data: sectionTeacherRows, refetch: refetchSectionTeachers } = useSectionSubjectTeacherAssignments(organizationId);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [formName, setFormName] = useState('');
  const [formSize, setFormSize] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [saving, setSaving] = useState(false);
  const [mapSection, setMapSection] = useState<Section | null>(null);
  const [teachingMap, setTeachingMap] = useState<Record<string, string>>({});

  const filtered = sections?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const teacherById = useMemo(() => new Map((teachers || []).map(teacher => [teacher.id, teacher])), [teachers]);
  const qualifiedTeacherIdsBySubject = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (teacherSubjects || []).forEach(row => {
      if (!map.has(row.subject_id)) map.set(row.subject_id, new Set());
      map.get(row.subject_id)!.add(row.teacher_id);
    });
    return map;
  }, [teacherSubjects]);

  const openCreate = () => { setEditing(null); setFormName(''); setFormSize(''); setClassTeacherId(''); setModalOpen(true); };
  const openEdit = (s: Section) => {
    setEditing(s);
    setFormName(s.name);
    setFormSize(String(s.size));
    setClassTeacherId(s.class_teacher_id || '');
    setModalOpen(true);
  };

  useEffect(() => {
    const maybeOpen = (resource?: string) => {
      const pending = resource || window.sessionStorage.getItem('slotforge:create-resource');
      if (pending === 'section') {
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
    id: 'sections.create',
    label: 'Create Section',
    shortcut: 'c c',
    keywords: ['class'],
    handler: openCreate,
  }), []));

  useShortcutAction(useMemo(() => ({
    id: 'sections.search',
    label: 'Focus Section Search',
    shortcut: '/',
    handler: () => searchRef.current?.focus(),
  }), []));

  const handleSave = async () => {
    if (!formName.trim() || !formSize || !organizationId) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/sections/${editing.id}`, { name: formName, size: parseInt(formSize), class_teacher_id: classTeacherId || null });
      } else {
        await api.post('/sections', { organization_id: organizationId, name: formName, size: parseInt(formSize), class_teacher_id: classTeacherId || null });
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

  const openTeachingMap = (section: Section) => {
    setMapSection(section);
    const nextMap: Record<string, string> = {};
    (sectionTeacherRows || [])
      .filter(row => row.section_id === section.id)
      .forEach(row => {
        nextMap[row.subject_id] = row.teacher_id;
      });
    setTeachingMap(nextMap);
  };

  const saveTeachingMap = async () => {
    if (!mapSection) return;
    setSaving(true);
    try {
      await api.put('/assignments/section-subject-teachers', {
        assignments: (subjects || []).map(subject => ({
          section_id: mapSection.id,
          subject_id: subject.id,
          teacher_id: teachingMap[subject.id] || null,
        })),
      });
      setMapSection(null);
      refetchSectionTeachers();
      refetchTeacherSubjects();
      refetchTeachers();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
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
            <ShortcutHint shortcut="c c" />
          </button>
        }
      />

      <div className="mb-5">
        <SearchInput
          inputRef={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sections..."
          shortcut="/"
        />
      </div>

      <div className="bg-paper-raised border-2 border-rule rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 bg-on-background text-paper-raised px-6 py-3">
          <div className="col-span-1 text-data-table font-semibold">#</div>
          <div className="col-span-4 text-data-table font-semibold">Section Name</div>
          <div className="col-span-2 text-data-table font-semibold">Class Size</div>
          <div className="col-span-2 text-data-table font-semibold">Class Teacher</div>
          <div className="col-span-2 text-data-table font-semibold">ID</div>
          <div className="col-span-1 text-data-table font-semibold text-right">Actions</div>
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
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min((s.size / 100) * 100, 100)}%` }} />
                  </div>
                  <span className="text-data-table text-on-surface font-medium">{s.size} students</span>
                </div>
                <div className="col-span-2 text-data-table text-on-surface">
                  {s.class_teacher_id ? teacherById.get(s.class_teacher_id)?.name || 'Assigned' : <span className="text-mono-grey">—</span>}
                </div>
                <div className="col-span-2 text-code-snippet text-mono-grey">{s.id.slice(0, 8)}</div>
                <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openTeachingMap(s)} className="p-1.5 rounded-lg hover:bg-accent-soft transition-colors" title="Teaching map">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>account_tree</span>
                  </button>
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
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Class Teacher</label>
            <select value={classTeacherId} onChange={(e) => setClassTeacherId(e.target.value)} className="academic-input w-full">
              <option value="">Unassigned</option>
              {(teachers || []).map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <Modal open={!!mapSection} onClose={() => setMapSection(null)} title={`Teaching map for ${mapSection?.name || ''}`}
        maxWidth="max-w-3xl"
        actions={
          <>
            <button onClick={() => setMapSection(null)} className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors">Cancel</button>
            <button onClick={saveTeachingMap} disabled={saving} className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {(subjects || []).map(subject => {
            const qualifiedIds = qualifiedTeacherIdsBySubject.get(subject.id) || new Set<string>();
            const sortedTeachers = [...(teachers || [])].sort((a, b) => {
              const aQualified = qualifiedIds.has(a.id) ? 0 : 1;
              const bQualified = qualifiedIds.has(b.id) ? 0 : 1;
              return aQualified - bQualified || a.name.localeCompare(b.name);
            });
            return (
              <div key={subject.id} className="grid grid-cols-12 items-center gap-3 rounded-lg border border-rule px-3 py-2">
                <div className="col-span-5">
                  <p className="text-sm font-medium text-on-surface">{subject.name}</p>
                  <p className="text-data-table text-mono-grey">{subject.weekly_hours} weekly periods</p>
                </div>
                <div className="col-span-7">
                  <select
                    value={teachingMap[subject.id] || ''}
                    onChange={(event) => setTeachingMap(prev => ({ ...prev, [subject.id]: event.target.value }))}
                    className="academic-input w-full"
                  >
                    <option value="">Use qualified pool</option>
                    {sortedTeachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}{qualifiedIds.has(teacher.id) ? '' : ' (adds qualification)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
