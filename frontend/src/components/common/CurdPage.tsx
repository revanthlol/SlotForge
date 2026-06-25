import { useState } from 'react';
import type { ReactNode } from 'react';
import { Table, Button, Modal, Form, Input, Tag, Space, Tooltip, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface CrudPageProps<T> {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconColor: string;
  data: T[];
  columns: ColumnsType<T>;
  formFields: ReactNode;
  onAdd: (values: Partial<T>) => void;
  onEdit: (id: string, values: Partial<T>) => void;
  onDelete: (id: string) => void;
  addLabel?: string;
}

export default function CrudPage<T extends { id: string; name: string }>({
  title, subtitle, icon, iconColor, data, columns, formFields,
  onAdd, onEdit, onDelete, addLabel = 'Add',
}: CrudPageProps<T>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const filtered = data.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const openEdit = (record: T) => { setEditing(record); form.setFieldsValue(record); setOpen(true); };
  const handleOk = async () => {
    const vals = await form.validateFields();
    if (editing) onEdit(editing.id, vals);
    else onAdd(vals);
    setOpen(false);
    form.resetFields();
  };

  const actionCol: ColumnsType<T>[0] = {
    key: 'actions', title: '', width: 80, align: 'right',
    render: (_, record) => (
      <Space size={4}>
        <Tooltip title="Edit">
          <Button
            type="text" size="small" icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            style={{ color: 'var(--color-text-muted)' }}
          />
        </Tooltip>
        <Tooltip title="Delete">
          <Button
            type="text" size="small" icon={<DeleteOutlined />}
            onClick={() => onDelete(record.id)}
            danger
          />
        </Tooltip>
      </Space>
    ),
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${iconColor}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: iconColor, fontSize: 20,
          }}>
            {icon}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              {subtitle}
            </p>
            <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {title}
            </h1>
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          {addLabel}
        </Button>
      </div>

      {/* Search + count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
          placeholder={`Search ${title.toLowerCase()}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
          allowClear
        />
        <Tag style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {filtered.length} total
        </Tag>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        <Table
          dataSource={filtered}
          columns={[...columns, actionCol]}
          rowKey="id"
          pagination={{ pageSize: 10, size: 'small', style: { padding: '12px 16px' } }}
          locale={{ emptyText: <Empty description="Nothing here yet — add your first entry above." /> }}
          size="middle"
        />
      </div>

      {/* Modal */}
      <Modal
        title={
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
            {editing ? `Edit ${title.slice(0, -1)}` : addLabel}
          </span>
        }
        open={open}
        onOk={handleOk}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        okText={editing ? 'Save changes' : 'Add'}
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {formFields}
        </Form>
      </Modal>
    </div>
  );
}
