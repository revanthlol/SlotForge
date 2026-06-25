export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;
export type Day = typeof DAYS[number];

export const SLOT_TIMES = [
  '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
] as const;

export const SLOT_LABELS = SLOT_TIMES.map((t, i) => {
  const next = SLOT_TIMES[i + 1];
  return next ? `${t}–${next}` : `${t}–17:00`;
});

export const SUBJECT_PALETTE = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#f97316', '#14b8a6',
];

export function colorForSubject(subjectId: string): string {
  let hash = 0;
  for (const ch of subjectId) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function clsx(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
