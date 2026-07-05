# Phase 12 — UI Polish (Motion Animations, Typography, Mobile)

**Agent:** Codex  
**Depends on:** Phase 2 (design system in place), all feature phases done  
**Blocks:** Nothing  
**Estimated effort:** Medium (2–3 days)  
**Priority:** Stretch goal — do last

---

## Goal

Polish the entire UI with:
1. **Motion animations** (using the `motion` library / Framer Motion)
2. **Typography and spacing improvements**
3. **Mobile / responsive improvements**
4. **Micro-interactions** on all interactive elements

This phase does not add new features — it makes everything feel premium.

---

## 1. Motion Animations

### Page Transitions

Every route change should animate:
```tsx
// app/layout.tsx
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

<AnimatePresence mode="wait">
  <motion.div key={location.pathname} {...pageVariants}>
    <Outlet />
  </motion.div>
</AnimatePresence>
```

### List Animations

Lists of cards (resources, versions, faculty) should stagger in:
```tsx
const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

<motion.div variants={containerVariants} animate="animate">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      <ResourceCard item={item} />
    </motion.div>
  ))}
</motion.div>
```

### Sidebar Navigation

Active item indicator slides smoothly:
```tsx
<motion.div
  layoutId="sidebar-active-indicator"
  className="sidebar-active-bg"
/>
// Using Framer Motion layoutId for smooth layout animations
```

### Timetable Cell Hover

Each timetable cell gets a hover micro-animation:
```tsx
<motion.td
  whileHover={{ scale: 1.02, backgroundColor: 'var(--color-bg-hover)' }}
  transition={{ duration: 0.1 }}
/>
```

### Solver Running State

While the solver runs, animate a pulsing status indicator:
```tsx
<motion.div
  animate={{ opacity: [0.4, 1, 0.4] }}
  transition={{ duration: 1.5, repeat: Infinity }}
  className="solver-pulse"
>
  Generating timetable...
</motion.div>
```

### Modal / Panel Transitions

Modals and side panels slide and fade in:
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
/>
```

---

## 2. Typography Improvements

### Font Stack
```css
/* styles/typography.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

body {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.6;
  font-feature-settings: 'cv11', 'ss01';  /* Inter alternates */
  -webkit-font-smoothing: antialiased;
}

h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.015em; }
h3 { font-size: 16px; font-weight: 600; }
.label { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-text-muted); }
code { font-family: var(--font-mono); font-size: 13px; }
```

### Numeric Tabular Figures
Use tabular numerals for all numbers in tables and stats:
```css
.timetable td, .stat-number {
  font-variant-numeric: tabular-nums;
}
```

---

## 3. Spacing + Card System

### Card Hierarchy
```
Level 1: Page background      → --color-bg-base
Level 2: Section cards        → --color-bg-elevated + border
Level 3: Nested items/rows    → --color-bg-card
Level 4: Hover state          → --color-bg-hover
```

### Consistent Spacing Grid

All padding/margin should follow the 4px base grid:
```
xs: 4px   (--space-1)
sm: 8px   (--space-2)
md: 16px  (--space-4)
lg: 24px  (--space-6)
xl: 32px  (--space-8)
```

---

## 4. Micro-interactions Checklist

Apply these to every interactive element:

| Element | Interaction |
|---|---|
| Buttons | Scale 0.98 on click, hover bg shift |
| Cards | Lift shadow on hover, subtle border glow |
| Sidebar nav items | Bg slide + text color transition |
| Table rows | Row highlight on hover |
| Form inputs | Border color transition on focus |
| Toggle switches | Smooth knob slide with spring physics |
| Status badges | Pulse animation for "generating" state |
| Drag handles | Cursor change + scale up |

---

## 5. Mobile / Responsive

The app is primarily a desktop app (scheduling dashboards are complex).
But the **public share page** (Phase 5) must be fully mobile-friendly.

For the main app, ensure:

### Responsive Breakpoints
```css
/* Tablet (768px+): Collapse sidebar to icons only */
@media (max-width: 1024px) {
  .sidebar { width: 60px; }
  .sidebar-label { display: none; }
}

/* Mobile (< 768px): Hide sidebar, add hamburger menu */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .mobile-topbar { display: flex; }
}
```

### Mobile-first Pages
These pages must be fully mobile-responsive:
- `/share/faculty/{token}` — faculty timetable share page
- `/invite/{token}` — invite accept page
- `/login` and `/signup`

### Timetable Mobile View
The timetable grid is too wide for mobile. Add a "Day View" mode that shows
one day at a time, with a swipe gesture to switch days:

```tsx
// Mobile: day selector + single day view
const [selectedDay, setSelectedDay] = useState('Monday');
<DaySelector days={days} selected={selectedDay} onChange={setSelectedDay} />
<MobileDayView day={selectedDay} assignments={assignments} />
```

---

## 6. Dark Mode Refinement

Make sure the dark mode is consistent and high-contrast:
- No pure black (#000000) backgrounds — use `hsl(222, 20%, 8%)` instead
- All text meets WCAG AA contrast ratios (4.5:1 for normal, 3:1 for large)
- Icons use `currentColor` so they adapt automatically
- Code blocks use a slightly different background to stand out

---

## Done Criteria

- [ ] Page transitions animate smoothly on every route change
- [ ] List items stagger in when a page loads
- [ ] Sidebar active indicator animates between items
- [ ] All buttons have scale/hover micro-animations
- [ ] Timetable cells have hover micro-animation
- [ ] Solver running state has a pulsing animation
- [ ] Modals and side panels slide/fade in
- [ ] Inter font loaded and applied everywhere
- [ ] Tabular numerals used in all tables and stats
- [ ] Spacing is consistent across all pages (4px grid)
- [ ] Faculty share page is fully mobile-responsive
- [ ] Invite accept page is fully mobile-responsive
- [ ] Main app sidebar collapses on tablet
- [ ] Mobile day view works for the timetable page
- [ ] Dark mode passes WCAG AA contrast checks
