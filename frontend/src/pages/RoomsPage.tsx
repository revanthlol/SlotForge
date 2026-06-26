import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShortcutHint, useShortcutAction } from '../contexts/ShortcutContext';
import { useRooms, type Room } from '../hooks/useApi';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';

export default function RoomsPage() {
  const { organizationId } = useAuth();
  const { data: rooms, loading, refetch } = useRooms(organizationId);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formType, setFormType] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = rooms?.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreate = () => {
    setEditingRoom(null);
    setFormName('');
    setFormCapacity('');
    setFormType('lecture');
    setModalOpen(true);
  };

  useEffect(() => {
    const maybeOpen = (resource?: string) => {
      const pending = resource || window.sessionStorage.getItem('slotforge:create-resource');
      if (pending === 'room') {
        window.sessionStorage.removeItem('slotforge:create-resource');
        openCreate();
      }
    };
    const onCreate = (event: Event) => maybeOpen((event as CustomEvent<string>).detail);
    maybeOpen();
    window.addEventListener('slotforge:create-resource', onCreate);
    return () => window.removeEventListener('slotforge:create-resource', onCreate);
  }, []);

  useShortcutAction(useMemo(() => ({
    id: 'rooms.create',
    label: 'Create Room',
    shortcut: 'c r',
    handler: openCreate,
  }), []));

  useShortcutAction(useMemo(() => ({
    id: 'rooms.search',
    label: 'Focus Room Search',
    shortcut: '/',
    handler: () => searchRef.current?.focus(),
  }), []));

  const openEdit = (r: Room) => {
    setEditingRoom(r);
    setFormName(r.name);
    setFormCapacity(String(r.capacity));
    setFormType(r.type);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formCapacity || !formType || !organizationId) return;
    setSaving(true);
    try {
      if (editingRoom) {
        await api.put(`/rooms/${editingRoom.id}`, {
          name: formName,
          capacity: parseInt(formCapacity),
          type: formType,
        });
      } else {
        await api.post('/rooms', {
          organization_id: organizationId,
          name: formName,
          capacity: parseInt(formCapacity),
          type: formType,
        });
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room?')) return;
    await api.delete(`/rooms/${id}`);
    refetch();
  };

  const typeColors: Record<string, string> = {
    lecture: 'bg-accent-soft text-primary',
    lab: 'bg-signal-soft text-secondary',
    auditorium: 'bg-tertiary-fixed text-on-tertiary-fixed',
    seminar: 'bg-primary-fixed text-on-primary-fixed',
  };

  return (
    <div>
      <PageHeader
        breadcrumb="RESOURCES / ROOMS"
        title="Rooms & Facilities"
        subtitle="Manage physical spaces, capacities, and equipment assignments"
        actions={
          <>
            {/* View toggle */}
            <div className="flex items-center border-2 border-rule rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 transition-colors ${viewMode === 'grid' ? 'bg-accent-soft text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 transition-colors ${viewMode === 'list' ? 'bg-accent-soft text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>view_list</span>
              </button>
            </div>
            <button
              onClick={openCreate}
              className="px-4 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              New Room
              <ShortcutHint shortcut="c r" />
            </button>
          </>
        }
      />

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-mono-grey" style={{ fontSize: 20 }}>
            search
          </span>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="academic-input w-full pl-10"
            placeholder="Search rooms..."
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <ShortcutHint shortcut="/" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-body-sm text-mono-grey">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-paper-raised border-2 border-rule rounded-xl px-6 py-16 text-center">
          <span className="material-symbols-outlined text-outline-variant mb-3" style={{ fontSize: 48 }}>meeting_room</span>
          <p className="text-body-lg text-on-surface-variant">No rooms configured</p>
          <p className="text-data-table text-mono-grey mt-1">Add rooms to enable timetable generation</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-3 gap-5">
          {filtered.map(r => (
            <div
              key={r.id}
              className="bg-paper-raised border-2 border-rule rounded-xl hover:border-primary/30 transition-all duration-200 group"
            >
              <div className="p-inset-compact">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-headline-sm text-on-surface">{r.name}</p>
                    <p className="text-code-snippet text-mono-grey mt-0.5">{r.id.slice(0, 8)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${typeColors[r.type] || 'bg-surface-container text-on-surface-variant'}`}
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  >
                    {r.type}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>group</span>
                    <span className="text-sm font-medium text-on-surface">{r.capacity}</span>
                    <span className="text-data-table text-mono-grey">seats</span>
                  </div>
                </div>

                {/* Capacity bar */}
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min((r.capacity / 200) * 100, 100)}%` }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(r)}
                    className="flex-1 py-1.5 text-xs font-medium text-on-surface-variant border border-rule rounded-lg hover:bg-accent-soft transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="py-1.5 px-3 text-xs font-medium text-error border border-error/20 rounded-lg hover:bg-error-container transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-paper-raised border-2 border-rule rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 bg-on-background text-paper-raised px-6 py-3">
            <div className="col-span-1 text-data-table font-semibold">#</div>
            <div className="col-span-3 text-data-table font-semibold">Room Name</div>
            <div className="col-span-2 text-data-table font-semibold">Type</div>
            <div className="col-span-2 text-data-table font-semibold">Capacity</div>
            <div className="col-span-2 text-data-table font-semibold">ID</div>
            <div className="col-span-2 text-data-table font-semibold text-right">Actions</div>
          </div>
          <div className="divide-y divide-rule">
            {filtered.map((r, idx) => (
              <div key={r.id} className="grid grid-cols-12 px-6 py-3 items-center hover:bg-surface-bright transition-colors group">
                <div className="col-span-1 text-data-table text-mono-grey">{idx + 1}</div>
                <div className="col-span-3 text-sm font-medium text-on-surface">{r.name}</div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${typeColors[r.type] || 'bg-surface-container text-on-surface-variant'}`}
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  >
                    {r.type}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-on-surface">{r.capacity}</div>
                <div className="col-span-2 text-code-snippet text-mono-grey">{r.id.slice(0, 8)}</div>
                <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-accent-soft transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>edit</span>
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-error-container transition-colors">
                    <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-rule bg-surface-container-low">
            <p className="text-data-table text-mono-grey">{filtered.length} room{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRoom ? 'Edit Room' : 'New Room'}
        actions={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !formName.trim()} className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : editingRoom ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Room Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="academic-input w-full" placeholder="Room 101" autoFocus />
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Capacity</label>
            <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} className="academic-input w-full" placeholder="60" min={1} />
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Room Type</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value)} className="academic-input w-full">
              <option value="lecture">Lecture</option>
              <option value="lab">Lab</option>
              <option value="auditorium">Auditorium</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
