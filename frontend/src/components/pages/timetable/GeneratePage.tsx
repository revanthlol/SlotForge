import { useState } from 'react';
import { Button, Select, Card, Alert, Steps, Tag, Divider, Spin } from 'antd';
import { ThunderboltOutlined, CheckCircleOutlined, WarningOutlined, RobotOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

type GenStatus = 'idle' | 'running' | 'success' | 'infeasible';

const AI_EXPLANATION = `The solver couldn't find a valid timetable because Room 204 is required by 3 sections simultaneously on Tuesday between 11:00–12:00.

**Suggested fixes:**
1. Add one more lecture room with capacity ≥ 55 seats
2. Shift Section CS-C's Networks class to Wednesday 11:00 slot (currently free)
3. Split the Tuesday 11:00 slot across two rooms if a partition is available

The minimum change needed is option 2 — it resolves the conflict without adding new resources.`;

export default function GeneratePage() {
  const [selectedSections, setSelectedSections] = useState<string[]>(['CS-A', 'CS-B']);
  const [status, setStatus] = useState<GenStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const runGenerate = async () => {
    setStatus('running');
    setCurrentStep(0);
    await new Promise(r => setTimeout(r, 800));
    setCurrentStep(1);
    await new Promise(r => setTimeout(r, 1200));
    setCurrentStep(2);
    await new Promise(r => setTimeout(r, 1000));
    setCurrentStep(3);
    // Simulate success (flip to 'infeasible' to test that path)
    setStatus('success');
  };

  const STEPS = [
    { title: 'Validating constraints' },
    { title: 'Building CP-SAT model' },
    { title: 'Running solver' },
    { title: 'Done' },
  ];

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          OR-Tools CP-SAT
        </p>
        <h1 style={{ margin: '4px 0', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
          Generate Timetable
        </h1>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Select sections and run the constraint solver to produce an optimal schedule.
        </p>
      </div>

      {/* Config */}
      <Card style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Sections to schedule
        </p>
        <Select
          mode="multiple"
          value={selectedSections}
          onChange={setSelectedSections}
          options={['CS-A', 'CS-B', 'CS-C'].map(s => ({ value: s, label: s }))}
          style={{ width: '100%' }}
          placeholder="Select sections"
          size="large"
        />
        <Divider style={{ borderColor: 'var(--color-border)', margin: '16px 0' }} />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Hard constraints', value: '8 active' },
            { label: 'Soft constraints', value: '3 active' },
            { label: 'Available rooms', value: '4' },
            { label: 'Available teachers', value: '3' },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, minWidth: 120 }}>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Generate button */}
      {status === 'idle' && (
        <Button
          type="primary" size="large" block
          icon={<ThunderboltOutlined />}
          onClick={runGenerate}
          disabled={selectedSections.length === 0}
          style={{ height: 48, fontSize: 15, fontWeight: 600, borderRadius: 'var(--radius-md)' }}
        >
          Generate timetable
        </Button>
      )}

      {/* Running */}
      {status === 'running' && (
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Spin size="large" />
            <p style={{ marginTop: 12, color: 'var(--color-text-secondary)', fontSize: 14 }}>Solver running...</p>
          </div>
          <Steps
            current={currentStep}
            size="small"
            items={STEPS}
            style={{ color: 'var(--color-text-secondary)' }}
          />
        </Card>
      )}

      {/* Success */}
      {status === 'success' && (
        <div>
          <Alert
            type="success"
            icon={<CheckCircleOutlined />}
            showIcon
            message={<span style={{ fontWeight: 600 }}>Timetable generated successfully</span>}
            description="All hard constraints satisfied. 2 soft constraint optimizations applied."
            style={{ marginBottom: 16, borderRadius: 'var(--radius-md)' }}
          />
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Sections scheduled', value: `${selectedSections.length}/${selectedSections.length}` },
                { label: 'Conflicts', value: '0' },
                { label: 'Solver time', value: '1.4s' },
                { label: 'Status', value: <Tag color="success">Optimal</Tag> },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ margin: 0, fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => navigate('/timetable')}>
              View timetable
            </Button>
            <Button onClick={() => setStatus('idle')} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-secondary)' }}>
              Regenerate
            </Button>
          </div>
        </div>
      )}

      {/* Infeasible */}
      {status === 'infeasible' && (
        <div>
          <Alert
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            message={<span style={{ fontWeight: 600 }}>No valid timetable found</span>}
            description="The current constraints can't be satisfied simultaneously. See the AI explanation below."
            style={{ marginBottom: 16, borderRadius: 'var(--radius-md)' }}
          />
          <Card>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <RobotOutlined style={{ color: 'var(--color-accent-light)', fontSize: 16, marginTop: 2 }} />
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)' }}>AI Conflict Explainer</p>
            </div>
            <div style={{
              background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)',
              padding: 16, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7,
              border: '1px solid var(--color-border-strong)',
            }}>
              {AI_EXPLANATION.split('\n').map((line, i) => (
                <p key={i} style={{ margin: '0 0 6px' }}>{line}</p>
              ))}
            </div>
            <Button style={{ marginTop: 12 }} onClick={() => setStatus('idle')}>
              Adjust constraints and retry
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
