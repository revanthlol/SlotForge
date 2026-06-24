import { useState } from 'react';
import { Form, Input, InputNumber, Select, Tag } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import CrudPage from '../../common/CurdPage';
import type { Room } from '../../../types';
import type { ColumnsType } from 'antd/es/table';

const MOCK_ROOMS: Room[] = [
  { id: '1', name: 'Room 101', capacity: 60, type: 'lecture', building: 'Block A', floor: 1 },
  { id: '2', name: 'Lab 201', capacity: 30, type: 'lab', building: 'Block B', floor: 2 },
  { id: '3', name: 'Seminar Hall', capacity: 40, type: 'seminar', building: 'Block A', floor: 0 },
  { id: '4', name: 'Room 204', capacity: 60, type: 'lecture', building: 'Block B', floor: 2 },
];

const TYPE_COLORS: Record<string, string> = { lecture: 'blue', lab: 'green', seminar: 'purple' };

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);

  const columns: ColumnsType<Room> = [
    {
      title: 'Room', dataIndex: 'name', key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{name}</span>,
    },
    {
      title: 'Type', dataIndex: 'type', key: 'type',
      render: (type: string) => <Tag color={TYPE_COLORS[type]}>{type}</Tag>,
    },
    {
      title: 'Capacity', dataIndex: 'capacity', key: 'capacity',
      render: (c: number) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c} seats</span>,
    },
    {
      title: 'Location', key: 'location',
      render: (_: unknown, r: Room) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{r.building}, Floor {r.floor}</span>
      ),
    },
  ];

  const formFields = (
    <>
      <Form.Item name="name" label="Room name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Room 101, CS Lab 2" />
      </Form.Item>
      <Form.Item name="type" label="Type" rules={[{ required: true }]}>
        <Select options={['lecture', 'lab', 'seminar'].map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
      </Form.Item>
      <Form.Item name="capacity" label="Seating capacity" rules={[{ required: true }]}>
        <InputNumber min={1} max={500} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="building" label="Building" rules={[{ required: true }]}>
        <Input placeholder="e.g. Block A" />
      </Form.Item>
      <Form.Item name="floor" label="Floor" initialValue={0}>
        <InputNumber min={0} max={10} style={{ width: '100%' }} />
      </Form.Item>
    </>
  );

  return (
    <CrudPage
      title="Rooms"
      subtitle="Spaces"
      icon={<HomeOutlined />}
      iconColor="#06b6d4"
      data={rooms}
      columns={columns}
      formFields={formFields}
      addLabel="Add room"
      onAdd={vals => setRooms(prev => [...prev, { ...vals, id: Date.now().toString() } as Room])}
      onEdit={(id, vals) => setRooms(prev => prev.map(r => r.id === id ? { ...r, ...vals } : r))}
      onDelete={id => setRooms(prev => prev.filter(r => r.id !== id))}
    />
  );
}
