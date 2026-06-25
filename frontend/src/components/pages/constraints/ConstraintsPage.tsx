import { useState } from 'react';
import { Card, Tag, Button, Switch, Divider, Input, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, LockOutlined, ControlOutlined } from '@ant-design/icons';

interface Constraint {
  id: string;
  type: 'hard' | 'soft';
  description: string;
  active: boolean;
  category: string;
}

const INITIAL: Constraint[] = [
  { id: '1', type: 'hard', description: 'No teacher can be in two rooms at the same time', active: true, category: 'Teacher' },
  { id: '2', type: 'hard', description: 'No room can host two classes simultaneously', active: true, category: 'Room' },
  { id: '3', type: 'hard', description: 'Lab sessions require consecutive 2-hour slots', active: true, category: 'Room' },
  { id: '4', type: 'hard', description: 'Section strength must not exceed room capacity', active: true, category: 'Room' },
  { id: '5', type: 'soft', description: 'Minimize gaps in teacher daily schedule', active: true, category: 'Teacher' },
  { id: '6', type: 'soft', description: 'Avoid scheduling difficult subjects after 3 PM', active: true, category: 'Schedule' },
  { id: '7', type: 'soft', description: 'Distribute subjects evenly across the week', active: false, category: 'Schedule' },
];

export default function ConstraintsPage() {
  const [constraints, setConstraints] = useState<Constraint[]>(INITIAL);
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<'hard' | 'soft'>('soft');

  const toggle = (id: string) => setConstraints(prev =>
    prev.map(c => c.id === id ? { ...c, active: !c.active } : c)
  );
  const remove = (id: string) => setConstraints(prev => prev.filter(c => c.id !== id));
  const add = () => {
    if (!newText.trim()) return;
    setConstraints(prev => [...prev, {
      id: Date.now().toString(), type: newType,
      description: newText.trim(), active: true, category: 'Custom',
    }]);
    setNewText('');
  };

  const hard = constraints.filter(c => c.type === 'hard');
  const soft = constraints.filter(c => c.type === 'soft');

  const Section = ({ title, items, color, icon }: { title: string; items: Constraint[]; color: string; icon: React.ReactNode }) => (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 15 }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)' }}>
            {items.filter(i => i.active).length}/{items.length} active
          </p>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty description="No constraints yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '10px 14px',
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${c.active ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
              opacity: c.active ? 1 : 0.5,
              transition: 'opacity 0.2s',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)' }}>{c.description}</p>
                <Tag style={{ marginTop: 4, fontSize: 10, fontFamily: 'var(--font-mono)' }}>{c.category}</Tag>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch size="small" checked={c.active} onChange={() => toggle(c.id)} />
                <Button type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => remove(c.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Solver Config
        </p>
        <h1 style={{ margin: '4px 0 4px', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
          Constraints
        </h1>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Hard constraints must be satisfied. Soft constraints are optimized where possible.
        </p>
      </div>

      <Section title="Hard Constraints" items={hard} color="#ef4444" icon={<LockOutlined />} />
      <Section title="Soft Constraints" items={soft} color="#f59e0b" icon={<ControlOutlined />} />

      {/* Add custom constraint */}
      <Card>
        <p style={{ margin: '0 0 12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Add custom constraint</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border-strong)', flexShrink: 0 }}>
            {(['hard', 'soft'] as const).map(t => (
              <button key={t} onClick={() => setNewType(t)} style={{
                padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: newType === t ? (t === 'hard' ? '#ef444420' : '#f59e0b20') : 'var(--color-bg-elevated)',
                color: newType === t ? (t === 'hard' ? '#ef4444' : '#f59e0b') : 'var(--color-text-muted)',
                border: 'none',
              }}>{t}</button>
            ))}
          </div>
          <Input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Describe a constraint in plain language..."
            onPressEnter={add}
            style={{ flex: 1 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={add}>Add</Button>
        </div>
        <Divider style={{ borderColor: 'var(--color-border)', margin: '16px 0 8px' }} />
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
          💡 Tip: Natural-language constraint parsing (AI) coming soon — the solver will convert your text into formal rules automatically.
        </p>
      </Card>
    </div>
  );
}
