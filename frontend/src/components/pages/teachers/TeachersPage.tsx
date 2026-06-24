import { useState } from 'react';
import { Form, Input, InputNumber, Select, Tag, Avatar } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import CrudPage from '../../common/CurdPage';
import type { Teacher } from '../../../types';
import type { ColumnsType } from 'antd/es/table';

const MOCK_TEACHERS: Teacher[] = [
  { id: '1', name: 'Dr. Rao', email: 'rao@college.edu', subjects: ['DBMS', 'OS'], maxHoursPerDay: 4, unavailableSlots: [], department: 'Computer Science' },
  { id: '2', name: 'Prof. Sharma', email: 'sharma@college.edu', subjects: ['Maths', 'Statistics'], maxHoursPerDay: 5, unavailableSlots: [], department: 'Mathematics' },
  { id: '3', name: 'Dr. Priya', email: 'priya@college.edu', subjects: ['Networks', 'Security'], maxHoursPerDay: 4, unavailableSlots: [], department: 'Computer Science' },
];

const SUBJECT_OPTIONS = ['DBMS', 'OS', 'Networks', 'Maths', 'Statistics', 'Security', 'Algorithms', 'ML'];
const DEPT_OPTIONS = ['Computer Science', 'Mathematics', 'Physics', 'Electronics'];

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(MOCK_TEACHERS);

  const columns: ColumnsType<Teacher> = [
    {
      title: 'Teacher', dataIndex: 'name', key: 'name',
      render: (name: string, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={32} style={{ background: '#6366f118', color: '#818cf8', fontWeight: 600, fontSize: 13 }}>
            {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </Avatar>
          <div>
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 13 }}>{name}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{record.email}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Department', dataIndex: 'department', key: 'department',
      render: (dept: string) => <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{dept}</span>,
    },
    {
      title: 'Subjects', dataIndex: 'subjects', key: 'subjects',
      render: (subjects: string[]) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {subjects.map(s => <Tag key={s} color="geekblue">{s}</Tag>)}
        </div>
      ),
    },
    {
      title: 'Max hrs/day', dataIndex: 'maxHoursPerDay', key: 'maxHoursPerDay', width: 110,
      render: (h: number) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)' }}>{h}h</span>,
    },
  ];

  const formFields = (
    <>
      <Form.Item name="name" label="Full name" rules={[{ required: true }]}>
        <Input placeholder="Dr. Firstname Lastname" />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
        <Input placeholder="teacher@college.edu" />
      </Form.Item>
      <Form.Item name="department" label="Department" rules={[{ required: true }]}>
        <Select options={DEPT_OPTIONS.map(d => ({ value: d, label: d }))} placeholder="Select department" />
      </Form.Item>
      <Form.Item name="subjects" label="Can teach" rules={[{ required: true }]}>
        <Select mode="multiple" options={SUBJECT_OPTIONS.map(s => ({ value: s, label: s }))} placeholder="Select subjects" />
      </Form.Item>
      <Form.Item name="maxHoursPerDay" label="Max hours/day" initialValue={4}>
        <InputNumber min={1} max={8} style={{ width: '100%' }} />
      </Form.Item>
    </>
  );

  return (
    <CrudPage
      title="Teachers"
      subtitle="People"
      icon={<TeamOutlined />}
      iconColor="#6366f1"
      data={teachers}
      columns={columns}
      formFields={formFields}
      addLabel="Add teacher"
      onAdd={vals => setTeachers(prev => [...prev, { ...vals, id: Date.now().toString(), unavailableSlots: [] } as Teacher])}
      onEdit={(id, vals) => setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...vals } : t))}
      onDelete={id => setTeachers(prev => prev.filter(t => t.id !== id))}
    />
  );
}
