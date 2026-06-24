import { useState } from 'react';
import { Form, Input, InputNumber, Select, Switch, Tag } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import CrudPage from '../../common/CurdPage';
import type { Subject } from '../../../types';
import type { ColumnsType } from 'antd/es/table';

const MOCK_SUBJECTS: Subject[] = [
  { id: '1', name: 'Database Management Systems', code: 'CS301', hoursPerWeek: 4, requiresLab: true, department: 'Computer Science' },
  { id: '2', name: 'Operating Systems', code: 'CS302', hoursPerWeek: 3, requiresLab: false, department: 'Computer Science' },
  { id: '3', name: 'Computer Networks', code: 'CS303', hoursPerWeek: 3, requiresLab: true, department: 'Computer Science' },
  { id: '4', name: 'Engineering Mathematics', code: 'MA301', hoursPerWeek: 4, requiresLab: false, department: 'Mathematics' },
];

const DEPT_OPTIONS = ['Computer Science', 'Mathematics', 'Physics', 'Electronics'];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS);

  const columns: ColumnsType<Subject> = [
    {
      title: 'Subject', key: 'subject',
      render: (_: unknown, r: Subject) => (
        <div>
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 13 }}>{r.name}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{r.code}</p>
        </div>
      ),
    },
    {
      title: 'Dept', dataIndex: 'department', key: 'department',
      render: (d: string) => <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{d}</span>,
    },
    {
      title: 'Hrs/week', dataIndex: 'hoursPerWeek', key: 'hoursPerWeek', width: 100,
      render: (h: number) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)' }}>{h}h</span>,
    },
    {
      title: 'Lab', dataIndex: 'requiresLab', key: 'requiresLab', width: 80,
      render: (v: boolean) => v ? <Tag color="green">Lab</Tag> : <Tag color="default">Theory</Tag>,
    },
  ];

  const formFields = (
    <>
      <Form.Item name="name" label="Subject name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Database Management Systems" />
      </Form.Item>
      <Form.Item name="code" label="Subject code" rules={[{ required: true }]}>
        <Input placeholder="e.g. CS301" style={{ fontFamily: 'var(--font-mono)' }} />
      </Form.Item>
      <Form.Item name="department" label="Department" rules={[{ required: true }]}>
        <Select options={DEPT_OPTIONS.map(d => ({ value: d, label: d }))} />
      </Form.Item>
      <Form.Item name="hoursPerWeek" label="Hours per week" rules={[{ required: true }]}>
        <InputNumber min={1} max={8} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="requiresLab" label="Requires lab" valuePropName="checked" initialValue={false}>
        <Switch />
      </Form.Item>
    </>
  );

  return (
    <CrudPage
      title="Subjects"
      subtitle="Curriculum"
      icon={<BookOutlined />}
      iconColor="#10b981"
      data={subjects}
      columns={columns}
      formFields={formFields}
      addLabel="Add subject"
      onAdd={vals => setSubjects(prev => [...prev, { ...vals, id: Date.now().toString() } as Subject])}
      onEdit={(id, vals) => setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...vals } : s))}
      onDelete={id => setSubjects(prev => prev.filter(s => s.id !== id))}
    />
  );
}
