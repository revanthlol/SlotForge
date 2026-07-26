import type { CSSProperties } from 'react';
import { colorMix, getSubjectFallbackColor, hashSubjectColor, readableTextColor } from './subjectColors';

export function safeSubjectColor(value?: string | null, fallbackKey = 'subject') {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value as string : hashSubjectColor(fallbackKey);
}

export function fallbackSubjectColor(name?: string | null, id?: string | null) {
  return getSubjectFallbackColor(id || name || 'subject', name);
}

export function timetableCardStyle(color: string): CSSProperties {
  const safeColor = safeSubjectColor(color);
  return {
    background: `linear-gradient(180deg, ${colorMix(safeColor, 0.16)}, ${colorMix(safeColor, 0.08)})`,
    borderColor: colorMix(safeColor, 0.42),
    boxShadow: `inset 4px 0 0 ${safeColor}, 0 1px 0 rgba(17, 24, 39, 0.04)`,
  };
}

export function timetableLabelStyle(color: string): CSSProperties {
  const safeColor = safeSubjectColor(color);
  return {
    color: safeColor,
    background: colorMix(safeColor, 0.12),
    borderColor: colorMix(safeColor, 0.28),
  };
}

export function timetablePillStyle(color: string): CSSProperties {
  const safeColor = safeSubjectColor(color);
  return {
    color: readableTextColor(safeColor),
    background: safeColor,
    borderColor: colorMix(safeColor, 0.55),
  };
}

export function timetableDividerStyle(color: string): CSSProperties {
  return {
    borderColor: colorMix(safeSubjectColor(color), 0.24),
  };
}
