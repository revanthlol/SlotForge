import { useState, type ReactNode } from 'react';
import api from '../../../lib/api';
import type { Section, Subject, Teacher, TeacherSubjectAssignment, SectionSubjectTeacherAssignment } from '../../../hooks/useApi';

export default function AssignmentStep({ teachers, subjects, sections, teacherAssignments, sectionAssignments, onRefresh }: {
  teachers: Teacher[];
  subjects: Subject[];
  sections: Section[];
  teacherAssignments: TeacherSubjectAssignment[];
  sectionAssignments: SectionSubjectTeacherAssignment[];
  onRefresh: () => void;
}) {
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [sectionSubjectId, setSectionSubjectId] = useState('');
  const [sectionTeacherId, setSectionTeacherId] = useState('');
  const [saving, setSaving] = useState(false);

  const addTeacherSubject = async () => {
    if (!teacherId || !subjectId) return;
    setSaving(true);
    try {
      const subjectIds = Array.from(new Set([...teacherAssignments.filter(item => item.teacher_id === teacherId).map(item => item.subject_id), subjectId]));
      await api.put(`/assignments/teacher-subjects/${teacherId}`, { subject_ids: subjectIds });
      onRefresh();
    } finally { setSaving(false); }
  };

  const addSectionMap = async () => {
    if (!sectionId || !sectionSubjectId) return;
    setSaving(true);
    try {
      const existing = sectionAssignments.filter(item => item.section_id === sectionId && item.subject_id !== sectionSubjectId)
        .map(item => ({ subject_id: item.subject_id, teacher_id: item.teacher_id }));
      await api.put('/assignments/section-subject-teachers', {
        section_id: sectionId,
        assignments: [...existing, { subject_id: sectionSubjectId, teacher_id: sectionTeacherId || null }],
      });
      onRefresh();
    } finally { setSaving(false); }
  };

  return <section className="space-y-6">
    <div>
      <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Step 9 · Optional</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,4.2rem)] font-semibold leading-[1.05] text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>Connect the people to the timetable.</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">Add the teaching maps you already know. Anything you skip can be completed later from Resources.</p>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <AssignmentCard eyebrow="Teacher expertise" title="Teacher ↔ subject">
        <Select label="Teacher" value={teacherId} onChange={setTeacherId} options={teachers.map(item => [item.id, item.name])} />
        <Select label="Subject" value={subjectId} onChange={setSubjectId} options={subjects.map(item => [item.id, item.name])} />
        <button type="button" disabled={saving || !teacherId || !subjectId} onClick={addTeacherSubject} className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">Add subject</button>
        <div className="space-y-2 pt-2">{teacherAssignments.map(item => <p key={item.id} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface">{teachers.find(row => row.id === item.teacher_id)?.name} <span className="text-mono-grey">teaches</span> {subjects.find(row => row.id === item.subject_id)?.name}</p>)}</div>
      </AssignmentCard>
      <AssignmentCard eyebrow="Teaching map" title="Section ↔ subject ↔ teacher">
        <Select label="Section" value={sectionId} onChange={setSectionId} options={sections.map(item => [item.id, item.name])} />
        <Select label="Subject" value={sectionSubjectId} onChange={setSectionSubjectId} options={subjects.map(item => [item.id, item.name])} />
        <Select label="Teacher (optional)" value={sectionTeacherId} onChange={setSectionTeacherId} options={teachers.map(item => [item.id, item.name])} emptyLabel="Leave unassigned" />
        <button type="button" disabled={saving || !sectionId || !sectionSubjectId} onClick={addSectionMap} className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">Add mapping</button>
        <div className="space-y-2 pt-2">{sectionAssignments.map(item => <p key={item.id} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface">{sections.find(row => row.id === item.section_id)?.name} · {subjects.find(row => row.id === item.subject_id)?.name} <span className="text-mono-grey">with</span> {teachers.find(row => row.id === item.teacher_id)?.name || 'Unassigned'}</p>)}</div>
      </AssignmentCard>
    </div>
  </section>;
}

function AssignmentCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <div className="rounded-xl border-2 border-rule bg-paper-raised p-5"><p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>{eyebrow}</p><h3 className="mt-2 text-headline-sm text-on-surface">{title}</h3><div className="mt-5 grid gap-3">{children}</div></div>;
}

function Select({ label, value, onChange, options, emptyLabel = `Choose a ${label.toLowerCase()}` }: { label: string; value: string; onChange: (value: string) => void; options: string[][]; emptyLabel?: string }) {
  return <label className="grid gap-1"><span className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>{label}</span><select className="academic-input w-full" value={value} onChange={event => onChange(event.target.value)}><option value="">{emptyLabel}</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}
