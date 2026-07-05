# Phase 11 — Canvas Map (React Flow)

**Agent:** Codex  
**Depends on:** Phase 2 (frontend structure), Phase 0 (generic models)  
**Blocks:** Nothing  
**Estimated effort:** Large (3–4 days)  
**Priority:** Stretch goal — do after Phases 0–9 are complete

---

## Goal

Transform the existing decorative Canvas Map into a **real relationship and
debugging visualization** using **React Flow**. The canvas shows the live state
of the workspace as an interactive node-based graph.

This is the "Obsidian graph view" for your scheduling workspace.

---

## Four Canvas Views

The canvas has 4 switchable view modes (tab/toggle in the top toolbar):

### View 1: Resource Graph
Shows relationships between all entities in the workspace.

```
Nodes: Teachers, Subjects, Sections, Rooms, Labs
Edges:
  Teacher → Subject (teaches)
  Subject → Section (required by)
  Section → Room (uses)
  Subject → Lab (requires lab)
```

Example visual:
```
[Dr. Kumar] ──teaches──> [Mathematics]
                                │
                          required by
                         ┌──────┴──────┐
                    [BSc CS-A]    [BSc CS-B]
                         │
                       uses
                    [Room 101]
```

### View 2: Constraint Graph
Shows which constraints affect which resources.

```
Nodes: Resources + Constraints
Edges:
  Constraint → Resource (affects)
```

Example:
```
[Avoid Last Period] ──affects──> [Dr. Kumar]
[Max 4 periods/day] ──affects──> [Dr. Patel]
[Lab Continuous Block] ──affects──> [Physics Lab]
[Reserve Assembly] ──blocks──> [Monday Period 2]
```

### View 3: Conflict Graph
Shows which resources are causing scheduling pressure / infeasibility.

```
Nodes: Resources (colored by pressure level)
Edges: Conflict relationships

🔴 [Lab 1] ─── over-demanded by ──> [Physics (BSc CS-A, B, C)]
🟠 [Dr. Kumar] ── load warning ──> [Maths, Physics, Chem]
🟢 [Room 101] ── normal ──> [3 sections]
```

### View 4: Version Graph
Shows the version history as a branching tree.

```
[v1 Published] ──branches to──> [v2 Draft A]
                                 [v3 Draft B] ──branches to──> [v5 Published]
                                                                [v6 Draft]
```

---

## Technical Implementation

Use **React Flow** (`reactflow` npm package):

```tsx
// features/canvas/CanvasPage.tsx
import ReactFlow, { Node, Edge, Controls, Background, MiniMap } from 'reactflow';

const CanvasPage = () => {
  const view = useCanvasView(); // 'resource' | 'constraint' | 'conflict' | 'version'
  const { nodes, edges } = useCanvasData(view);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <CanvasViewSwitcher current={view} onChange={setView} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background color="#1a1a2e" gap={16} />
      </ReactFlow>
    </div>
  );
};
```

### Custom Node Types

```tsx
// features/canvas/nodes/ResourceNode.tsx
const ResourceNode = ({ data }) => (
  <div className={`canvas-node canvas-node--${data.type}`}>
    <ResourceIcon type={data.type} />
    <span>{data.label}</span>
    {data.pressureLevel && <PressureDot level={data.pressureLevel} />}
  </div>
);
```

### Node Colors by Type
```
Teacher:   blue (#3b82f6)
Subject:   purple (#8b5cf6)
Section:   green (#10b981)
Room:      orange (#f59e0b)
Lab:       yellow (#eab308)
Constraint: red (#ef4444)
Version:   gray (#6b7280)
```

### Pressure Color Override (Conflict View)
```
🔴 CRITICAL:  #ef4444 border, pulsing animation
🟠 HIGH:      #f97316 border
🟡 MEDIUM:    #eab308 border
🟢 LOW:       #22c55e border
```

---

## Interaction Features

### Click on Node
Opens a side panel with details:
```
[Side Panel: Dr. Kumar]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Resource: Teacher
Subjects: Mathematics, Physics
Sections: BSc CS-A, BSc CS-B, BSc CS-C
Total periods: 18/week
Availability: Mon-Fri, except Wed afternoon
Constraints affecting: 2 (Max load, Avoid last period)
Pressure level: HIGH (28h required, 24h available)
[View in Timetable]  [Edit]
```

### Hover on Edge
Shows edge label tooltip:
```
"teaches 4 subjects | 12 periods/week total"
```

### Canvas Toolbar
```
[Resource Graph] [Constraint Graph] [Conflict Graph] [Version Graph]
[Search nodes...] [Filter by type ▼] [Reset view] [Full screen]
```

---

## Backend Endpoint

```
GET /api/v1/workspaces/{id}/canvas?view=resource|constraint|conflict|version
→ returns { nodes: CanvasNode[], edges: CanvasEdge[] }
```

```python
class CanvasNode(BaseModel):
    id: str
    type: str           # "teacher" | "subject" | "constraint" | "version" | etc.
    label: str
    metadata: dict      # type-specific data
    pressure_level: str | None  # for conflict view

class CanvasEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str | None
    edge_type: str      # "teaches" | "requires" | "affects" | "branches_to"
```

---

## Files to Create

### Frontend (Codex)
- `features/canvas/CanvasPage.tsx`
- `features/canvas/CanvasViewSwitcher.tsx`
- `features/canvas/NodeDetailPanel.tsx`
- `features/canvas/nodes/ResourceNode.tsx`
- `features/canvas/nodes/ConstraintNode.tsx`
- `features/canvas/nodes/VersionNode.tsx`
- `features/canvas/hooks/useCanvasData.ts`

### Backend (Antigravity adds endpoint)
- `backend/app/api/canvas.py` — GET /workspaces/{id}/canvas

---

## Done Criteria

- [ ] All 4 views render correctly with real data from the backend
- [ ] Resource Graph shows all entities and their relationships as nodes + edges
- [ ] Constraint Graph shows constraint → resource relationships
- [ ] Conflict Graph colors nodes by pressure level from Phase 7 data
- [ ] Version Graph shows the branching tree of schedule runs
- [ ] Clicking a node opens a detail side panel
- [ ] Canvas is interactive: pan, zoom, fit-view
- [ ] MiniMap and Controls are visible
- [ ] Canvas toolbar allows switching between views
