import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export interface ShortcutAction {
  id: string;
  label: string;
  shortcut?: string;
  keywords?: string[];
  handler: () => void;
}

interface ShortcutContextValue {
  registerAction: (action: ShortcutAction) => () => void;
  openPalette: () => void;
  openHelp: () => void;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
};

const shortcutLabel = (shortcut?: string) => shortcut?.replace('mod', navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl');

function ShortcutHint({ shortcut }: { shortcut?: string }) {
  if (!shortcut) return null;
  return (
    <kbd className="ml-auto rounded border border-rule bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-mono-grey">
      {shortcutLabel(shortcut)}
    </kbd>
  );
}

function CommandPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: ShortcutAction[];
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  if (!open) return null;

  const normalized = query.trim().toLowerCase();
  const filtered = actions.filter(action => {
    if (!normalized) return true;
    const haystack = [action.label, action.shortcut, ...(action.keywords || [])].join(' ').toLowerCase();
    return haystack.includes(normalized);
  });

  return (
    <div className="fixed inset-0 z-[120] bg-on-background/30 backdrop-blur-sm p-4" onMouseDown={onClose}>
      <div
        className="mx-auto mt-[10vh] w-full max-w-2xl overflow-hidden rounded-xl border-2 border-rule bg-paper-raised shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
          <span className="material-symbols-outlined text-mono-grey" style={{ fontSize: 20 }}>search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm text-on-surface outline-none"
            placeholder="Run command..."
            autoFocus
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-body-sm text-mono-grey">No matching commands</div>
          ) : filtered.map(action => (
            <button
              key={action.id}
              onClick={() => {
                action.handler();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-on-surface hover:bg-accent-soft"
            >
              <span>{action.label}</span>
              <ShortcutHint shortcut={action.shortcut} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShortcutHelp({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: ShortcutAction[];
}) {
  if (!open) return null;
  const withShortcuts = actions.filter(action => action.shortcut);

  return (
    <div className="fixed inset-0 z-[121] bg-on-background/30 backdrop-blur-sm p-4" onMouseDown={onClose}>
      <div
        className="mx-auto mt-[12vh] w-full max-w-xl rounded-xl border-2 border-rule bg-paper-raised shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-rule px-6 py-4">
          <h2 className="text-headline-sm text-on-surface">Shortcuts</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent-soft">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="grid gap-1 p-4">
          {withShortcuts.map(action => (
            <div key={action.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
              <span className="text-on-surface">{action.label}</span>
              <ShortcutHint shortcut={action.shortcut} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShortcutProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [actions, setActions] = useState<ShortcutAction[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const sequenceRef = useRef('');

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openHelp = useCallback(() => setHelpOpen(true), []);

  const registerAction = useCallback((action: ShortcutAction) => {
    setActions(prev => [...prev.filter(item => item.id !== action.id), action]);
    return () => setActions(prev => prev.filter(item => item.id !== action.id));
  }, []);

  const openResourceCreate = useCallback((resource: string, path: string) => {
    window.sessionStorage.setItem('slotforge:create-resource', resource);
    window.dispatchEvent(new CustomEvent('slotforge:create-resource', { detail: resource }));
    navigate(path);
  }, [navigate]);

  const globalActions = useMemo<ShortcutAction[]>(() => [
    { id: 'nav.dashboard', label: 'Go to Dashboard', shortcut: 'g d', keywords: ['home'], handler: () => navigate('/dashboard') },
    { id: 'nav.teachers', label: 'Go to Teachers', shortcut: 'g t', keywords: ['faculty'], handler: () => navigate('/resources/teachers') },
    { id: 'nav.rooms', label: 'Go to Rooms', shortcut: 'g r', handler: () => navigate('/resources/rooms') },
    { id: 'nav.subjects', label: 'Go to Subjects', shortcut: 'g s', handler: () => navigate('/resources/subjects') },
    { id: 'nav.sections', label: 'Go to Sections', shortcut: 'g c', keywords: ['classes'], handler: () => navigate('/resources/sections') },
    { id: 'nav.timetable', label: 'Go to Timetable', shortcut: 'g m', handler: () => navigate('/timetable') },
    { id: 'nav.versions', label: 'Go to Version History', shortcut: 'g v', handler: () => navigate('/versions') },
    { id: 'nav.solver', label: 'Go to Solver Engine', shortcut: 'g e', handler: () => navigate('/solver') },
    { id: 'create.teacher', label: 'Create Teacher', shortcut: 'c t', handler: () => openResourceCreate('teacher', '/resources/teachers') },
    { id: 'create.room', label: 'Create Room', shortcut: 'c r', handler: () => openResourceCreate('room', '/resources/rooms') },
    { id: 'create.subject', label: 'Create Subject', shortcut: 'c s', handler: () => openResourceCreate('subject', '/resources/subjects') },
    { id: 'create.section', label: 'Create Section', shortcut: 'c c', keywords: ['class'], handler: () => openResourceCreate('section', '/resources/sections') },
    { id: 'help.shortcuts', label: 'Show Shortcuts', shortcut: '?', handler: openHelp },
    { id: 'palette.open', label: 'Open Command Palette', shortcut: 'mod+k', handler: openPalette },
  ], [navigate, openHelp, openPalette, openResourceCreate]);

  const allActions = useMemo(() => [...globalActions, ...actions], [globalActions, actions]);
  const contextValue = useMemo(() => ({
    registerAction,
    openPalette,
    openHelp,
  }), [registerAction, openPalette, openHelp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setHelpOpen(false);
        sequenceRef.current = '';
        return;
      }
      if (isTypingTarget(event.target)) return;

      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }

      const key = event.key.toLowerCase();
      if (!/^[a-z/]$/.test(key)) return;
      const next = sequenceRef.current ? `${sequenceRef.current} ${key}` : key;
      const exact = allActions.find(action => action.shortcut === next);
      const partial = allActions.some(action => action.shortcut?.startsWith(`${next} `));

      if (exact) {
        event.preventDefault();
        exact.handler();
        sequenceRef.current = '';
      } else if (partial) {
        event.preventDefault();
        sequenceRef.current = next;
      } else {
        sequenceRef.current = '';
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [allActions]);

  return (
    <ShortcutContext.Provider value={contextValue}>
      {children}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={allActions} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} actions={allActions} />
    </ShortcutContext.Provider>
  );
}

export function useShortcutAction(action: ShortcutAction) {
  const context = useContext(ShortcutContext);
  useEffect(() => {
    if (!context) return;
    return context.registerAction(action);
  }, [context, action]);
}

export { ShortcutHint };
