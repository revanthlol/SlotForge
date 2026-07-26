import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ShortcutHint, useShortcutAction } from '../../../contexts/ShortcutContext';
import { useRooms, type Room } from '../../../hooks/useApi';
import api from '../../../lib/api';
import PageHeader from '../../../components/ui/PageHeader';
import Modal from '../../../components/ui/Modal';
import SearchInput from '../../../components/ui/SearchInput';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { getApiErrorMessage } from '../../../lib/errors';
import { usePresetConfig } from '../../presets/hooks/usePresetConfig';
import { useWorkspaces } from '../../../lib/api/hooks/useWorkspaces';
import ConflictPanel from '../../heatmap/ConflictPanel';
import { useImpactAnalysis } from '../../heatmap/hooks/useImpactAnalysis';

export default function RoomsPage() {
  const { organizationId } = useAuth();
  const config = usePresetConfig();
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.[0];
  const activePreset = workspace?.domain_preset || 'academic';
  const impact = useImpactAnalysis(workspace?.id || null);
  const showImpactPanel = Boolean(impact.loading || impact.error || (impact.data && !impact.data.feasible));

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
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const allowedTypes = useMemo(() => {
    switch (activePreset) {
      case 'academic': return ['classroom', 'lab'];
      case 'staff_roster': return ['work_zone'];
      case 'event': return ['hall'];
      case 'exam': return ['exam_hall'];
      case 'facility': return ['facility'];
      default: return ['classroom', 'lab'];
    }
  }, [activePreset]);

  const filtered = rooms?.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreate = useCallback(() => {
    setEditingRoom(null);
    setFormName('');
    setFormCapacity('');
    setFormType(allowedTypes[0] || 'classroom');
    setModalOpen(true);
  }, [allowedTypes]);

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
  }, [openCreate]);

  useShortcutAction(useMemo(() => ({
    id: 'rooms.create',
    label: `Create ${config.roomLabel}`,
    shortcut: 'c r',
    handler: openCreate,
  }), [config.roomLabel, openCreate]));

  useShortcutAction(useMemo(() => ({
    id: 'rooms.search',
    label: `Focus ${config.roomLabel} Search`,
    shortcut: '/',
    handler: () => searchRef.current?.focus(),
  }), [config.roomLabel]));

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
      const nextCapacity = parseInt(formCapacity, 10);
      const capacityChanged = Boolean(editingRoom && editingRoom.capacity !== nextCapacity);
      if (editingRoom) {
        await api.put(`/rooms/${editingRoom.id}`, {
          name: formName,
          capacity: nextCapacity,
          room_type: formType,
        });
      } else {
        await api.post('/rooms', {
          organization_id: organizationId,
          name: formName,
          capacity: nextCapacity,
          room_type: formType,
        });
      }
      setModalOpen(false);
      refetch();
      if (capacityChanged && editingRoom && workspace?.id) {
        await impact.analyze({
          change_type: 'room_capacity',
          entity_id: editingRoom.id,
          new_value: nextCapacity,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setDeleteError(null);
    try {
      await api.delete(`/rooms/${deleteTarget.id}`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, `Could not delete ${config.roomLabel.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };

  const typeColors: Record<string, string> = {
    classroom: 'bg-accent-soft text-primary',
    lab: 'bg-signal-soft text-secondary',
    work_zone: 'bg-tertiary-fixed text-on-tertiary-fixed',
    hall: 'bg-primary-fixed text-on-primary-fixed',
    exam_hall: 'bg-signal-soft text-secondary',
    facility: 'bg-accent-soft text-primary',
  };

  return (
    <div>
      <PageHeader
        breadcrumb={`RESOURCES / ${config.roomTitle.toUpperCase()}`}
        title={config.roomTitle}
        subtitle={`Manage physical ${config.roomTitle.toLowerCase()}, capacities, and configurations`}
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
              New {config.roomLabel}
              <ShortcutHint shortcut="c r" />
            </button>
          </>
        }
      />

      {/* Search */}
      <div className="mb-5">
        <SearchInput
          inputRef={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder={`Search ${config.roomTitle.toLowerCase()}...`}
          shortcut="/"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-body-sm text-mono-grey">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-paper-raised border-2 border-rule rounded-xl px-6 py-16 text-center">
          <span className="material-symbols-outlined text-outline-variant mb-3" style={{ fontSize: 48 }}>meeting_room</span>
          <p className="text-body-lg text-on-surface-variant">No {config.roomTitle.toLowerCase()} configured</p>
          <p className="text-data-table text-mono-grey mt-1">Add {config.roomTitle.toLowerCase()} to enable generation</p>
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
                    <span className="text-data-table text-mono-grey">capacity</span>
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
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(r);
                    }}
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
            <div className="col-span-3 text-data-table font-semibold">{config.roomLabel} Name</div>
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
                  <button onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(r);
                  }} className="p-1.5 rounded-lg hover:bg-error-container transition-colors">
                    <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-rule bg-surface-container-low">
            <p className="text-data-table text-mono-grey">{filtered.length} {filtered.length !== 1 ? config.roomTitle.toLowerCase() : config.roomLabel.toLowerCase()}</p>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRoom ? `Edit ${config.roomLabel}` : `New ${config.roomLabel}`}
        actions={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !formName.trim()} data-modal-primary="true" className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : editingRoom ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>{config.roomLabel} Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="academic-input w-full" placeholder={config.roomPlaceholder} autoFocus />
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Capacity</label>
            <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} className="academic-input w-full" placeholder="60" min={1} />
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>{config.roomLabel} Type</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value)} className="academic-input w-full">
              {allowedTypes.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${config.roomLabel.toLowerCase()}`}
        message={`Delete ${deleteTarget?.name || `this ${config.roomLabel.toLowerCase()}`}? Existing timetable slots using this ${config.roomLabel.toLowerCase()} may need regeneration.`}
        loading={saving}
        error={deleteError}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />

      <ConflictPanel
        open={showImpactPanel}
        report={impact.data}
        loading={impact.loading}
        error={impact.error}
        onClose={impact.clear}
      />
    </div>
  );
}
