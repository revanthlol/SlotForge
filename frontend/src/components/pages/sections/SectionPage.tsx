import { useState } from 'react';
import { Form, Input, InputNumber, Select, Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import CrudPage from '../../common/CurdPage';
import type { Section } from '../../../types';
import type { ColumnsType } from 'antd/es/table';

const MOCK_SECTIONS: Section[] = [
  { id: '1', name: 'CS-A', strength: 60, department: 'Computer Science', semester: 3, subjects: ['CS301', 'CS302', 'CS303', 'MA301'] },
  { id: '2', name: 'CS-B', strength: 58, department: 'Computer Science', semester: 3, subjects: ['CS301', 'CS302', 'CS303', 'MA301'] },
  { id: '3', name: 'CS-C', strength: 55, department: 'Computer Science', semester: 5, subjects: ['CS301', 'CS302'] },
];

const DEPT_OPTIONS = ['Computer Science', 'Mathematics', 'Physics', 'Electronics'];
const SUBJECT_OPTIONS = ['CS301', 'CS302', 'CS303', 'MA301'];

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>(MOCK_SECTIONS);

  const columns: ColumnsType<Section> = [
    {
      title: 'Section', dataIndex: 'name', key: 'name',
      render: (name: string) => (
        <span style={{
          fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14,
          color: 'var(--color-accent-light)',
        }}>{name}</span>
      ),
    },
    {
      title: 'Department', dataIndex: 'department', key: 'department',
      render: (d: string) => <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{d}</span>,
    },
    {
      title: 'Semester', dataIndex: 'semester', key: 'semester', width: 90,
      render: (s: number) => <Tag color="purple">Sem {s}</Tag>,
    },
    {
      title: 'Strength', dataIndex: 'strength', key: 'strength', width: 90,
      render: (s: number) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)' }}>{s}</span>,
    },
    {
      title: 'Subjects', dataIndex: 'subjects', key: 'subjects',
      render: (subjects: string[]) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {subjects.map(s => <Tag key={s}>{s}</Tag>)}
        </div>
      ),
    },
  ];

  const formFields = (
    <>
      <Form.Item name="name" label="Section name" rules={[{ required: true }]}>
        <Input placeholder="e.g. CS-A" style={{ fontFamily: 'var(--font-mono)' }} />
      </Form.Item>
      <Form.Item name="department" label="Department" rules={[{ required: true }]}>
        <Select options={DEPT_OPTIONS.map(d => ({ value: d, label: d }))} />
      </Form.Item>
      <Form.Item name="semester" label="Semester" rules={[{ required: true }]}>
        <InputNumber min={1} max={8} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="strength" label="Student strength" rules={[{ required: true }]}>
        <InputNumber min={1} max={200} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="subjects" label="Assigned subjects">
        <Select mode="multiple" options={SUBJECT_OPTIONS.map(s => ({ value: s, label: s }))} placeholder="Select subject codes" />
      </Form.Item>
    </>
  );

  return (
    <CrudPage
      title="Sections"
      subtitle="Classes"
      icon={<AppstoreOutlined />}
      iconColor="#f59e0b"
      data={sections}
      columns={columns}
      formFields={formFields}
      addLabel="Add section"
      onAdd={vals => setSections(prev => [...prev, { ...vals, id: Date.now().toString() } as Section])}
      onEdit={(id, vals) => setSections(prev => prev.map(s => s.id === id ? { ...s, ...vals } : s))}
      onDelete={id => setSections(prev => prev.filter(s => s.id !== id))}
    />
  );
}
