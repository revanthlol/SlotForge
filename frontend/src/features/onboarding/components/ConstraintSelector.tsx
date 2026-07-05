import type { DomainPresetKey } from './presets';

const constraintTemplates: Record<DomainPresetKey, { key: string; label: string; description: string }[]> = {
  academic: [
    { key: 'no_teacher_double_booking', label: 'No teacher double booking', description: 'A teacher cannot teach two classes in the same period.' },
    { key: 'no_room_double_booking', label: 'No room double booking', description: 'Rooms and labs can host one section at a time.' },
    { key: 'weekly_subject_hours', label: 'Weekly subject hours', description: 'Every subject receives its configured weekly periods.' },
    { key: 'section_room_split_capacity', label: 'Section-room split', description: 'Allow large sections to split across compatible rooms.' },
  ],
  staff_roster: [
    { key: 'coverage_per_shift', label: 'Coverage per shift', description: 'Each shift must meet minimum staffing coverage.' },
    { key: 'rest_between_shifts', label: 'Rest between shifts', description: 'Avoid assigning back-to-back shifts without rest.' },
    { key: 'role_coverage', label: 'Role coverage', description: 'Critical roles must be staffed in each block.' },
  ],
  event: [
    { key: 'no_speaker_clash', label: 'No speaker clash', description: 'A speaker cannot appear in overlapping sessions.' },
    { key: 'hall_capacity', label: 'Hall capacity', description: 'Sessions should fit within assigned hall capacity.' },
    { key: 'equipment_match', label: 'Equipment match', description: 'Sessions should use halls with required equipment.' },
  ],
  exam: [
    { key: 'no_student_clash', label: 'No student clash', description: 'Courses with overlapping students cannot share a slot.' },
    { key: 'hall_capacity', label: 'Hall capacity', description: 'Exam halls must seat assigned students.' },
    { key: 'invigilator_load', label: 'Invigilator load', description: 'Distribute invigilation assignments fairly.' },
  ],
  facility: [
    { key: 'max_booking_duration', label: 'Max booking duration', description: 'Requests should respect maximum booking windows.' },
    { key: 'advance_notice', label: 'Advance notice', description: 'Requests should meet notice requirements.' },
    { key: 'availability_window', label: 'Availability window', description: 'Bookings must fall inside facility hours.' },
  ],
};

export default function ConstraintSelector({
  preset,
  value,
  onChange,
}: {
  preset: DomainPresetKey;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const templates = constraintTemplates[preset];

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-headline-sm text-on-surface">Select default constraints</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
          Start with the templates SlotForge can check before generating. You can tune weights later.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => {
          const selected = value.includes(template.key);
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => toggle(template.key)}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${
                selected ? 'border-primary bg-accent-soft' : 'border-rule bg-paper-raised hover:border-primary/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md ${selected ? 'bg-primary text-on-primary' : 'bg-surface-container text-mono-grey'}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{selected ? 'check' : 'add'}</span>
                </span>
                <span>
                  <span className="block text-sm font-black text-on-surface">{template.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-on-surface-variant">{template.description}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
