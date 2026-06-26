/**
 * SlotForge Design Tokens — "Industrial Academic"
 * Source of truth: stitch_comprehensive_frontend_design/industrial_academic/DESIGN.md
 *
 * These are typed constants for programmatic use (e.g. chart colors, ReactFlow nodes).
 * CSS consumption is via Tailwind v4 @theme in index.css.
 */

export const colors = {
  // Surfaces
  surface: '#f7f9ff',
  'surface-dim': '#d7dae0',
  'surface-bright': '#f7f9ff',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f1f4f9',
  'surface-container': '#ebeef3',
  'surface-container-high': '#e5e8ee',
  'surface-container-highest': '#e0e3e8',
  'surface-variant': '#e0e3e8',
  'surface-tint': '#376759',

  // On-surfaces
  'on-surface': '#181c20',
  'on-surface-variant': '#404945',
  'on-background': '#181c20',

  // Inverse
  'inverse-surface': '#2d3135',
  'inverse-on-surface': '#eef1f6',
  'inverse-primary': '#9fd1bf',

  // Primary (Deep Pine)
  primary: '#124538',
  'on-primary': '#ffffff',
  'primary-container': '#2d5d4f',
  'on-primary-container': '#a1d4c2',
  'primary-fixed': '#baeddb',
  'primary-fixed-dim': '#9fd1bf',
  'on-primary-fixed': '#002018',
  'on-primary-fixed-variant': '#1e4f41',

  // Secondary (Burnt Orange)
  secondary: '#9c440f',
  'on-secondary': '#ffffff',
  'secondary-container': '#fd8e55',
  'on-secondary-container': '#6e2a00',
  'secondary-fixed': '#ffdbcc',
  'secondary-fixed-dim': '#ffb693',
  'on-secondary-fixed': '#351000',
  'on-secondary-fixed-variant': '#7a3000',

  // Tertiary
  tertiary: '#5e312a',
  'on-tertiary': '#ffffff',
  'tertiary-container': '#794740',
  'on-tertiary-container': '#fcb9af',
  'tertiary-fixed': '#ffdad5',
  'tertiary-fixed-dim': '#f9b6ac',
  'on-tertiary-fixed': '#34100b',
  'on-tertiary-fixed-variant': '#693a33',

  // Error
  error: '#ba1a1a',
  'on-error': '#ffffff',
  'error-container': '#ffdad6',
  'on-error-container': '#93000a',

  // Outline
  outline: '#707975',
  'outline-variant': '#c0c8c4',

  // Paper & Ink System
  paper: '#f7f5f0',
  'paper-raised': '#ffffff',
  'grid-line': 'rgba(27, 31, 35, 0.08)',
  rule: 'rgba(27, 31, 35, 0.14)',
  'accent-soft': 'rgba(45, 93, 79, 0.12)',
  'signal-soft': 'rgba(196, 98, 45, 0.12)',
  'mono-grey': '#6b6f73',

  // Background
  background: '#f7f9ff',
} as const;

export const fonts = {
  display: 'Fraunces, Georgia, serif',
  body: '"IBM Plex Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
} as const;

export const spacing = {
  'grid-unit': '64px',
  gutter: '16px',
  'margin-page': '32px',
  'stack-lg': '64px',
  'stack-md': '32px',
  'stack-sm': '16px',
} as const;
