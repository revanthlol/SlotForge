export const SUBJECT_PALETTE = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#be123c',
  '#4f46e5',
  '#0d9488',
  '#ca8a04',
  '#7c3aed',
  '#15803d',
  '#c026d3',
  '#0284c7',
  '#b45309',
  '#e11d48',
];

const SUBJECT_NAME_COLORS: Record<string, string> = {
  mathematics: '#2563eb',
  math: '#2563eb',
  physics: '#7c3aed',
  chemistry: '#059669',
  english: '#dc2626',
  'computer science': '#d97706',
  cs: '#d97706',
  biology: '#0d9488',
  history: '#b45309',
  geography: '#0284c7',
  economics: '#ca8a04',
  commerce: '#0891b2',
  hindi: '#c026d3',
  sanskrit: '#9333ea',
};

function normalizeSubjectName(value?: string | null) {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function hashSubjectColor(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = id.charCodeAt(index) + ((hash << 5) - hash);
  }
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

export function getSubjectFallbackColor(id: string, name?: string | null) {
  const namedColor = SUBJECT_NAME_COLORS[normalizeSubjectName(name)];
  return namedColor || hashSubjectColor(id || name || 'subject');
}

export function getSubjectColor(subject: { id: string; name?: string | null; color?: string | null }) {
  return subject.color || getSubjectFallbackColor(subject.id, subject.name);
}

export function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function readableTextColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#111827' : '#ffffff';
}

export function colorMix(hex: string, opacity = 0.14) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
