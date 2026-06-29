import type { InputHTMLAttributes, Ref } from 'react';
import { ShortcutHint } from '../../contexts/ShortcutContext';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  wrapperClassName?: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement>;
  shortcut?: string;
  onClear?: () => void;
}

export default function SearchInput({
  wrapperClassName = '',
  inputClassName = '',
  inputRef,
  shortcut,
  onClear,
  ...props
}: SearchInputProps) {
  const hasValue = typeof props.value === 'string' && props.value.length > 0;

  return (
    <div
      className={`flex h-12 w-full max-w-md items-center overflow-hidden border-b-2 border-on-background bg-paper-raised shadow-sm transition-colors focus-within:border-primary ${wrapperClassName}`.trim()}
    >
      <span className="flex h-full w-12 shrink-0 items-center justify-center text-mono-grey" aria-hidden="true">
        <span className="material-symbols-outlined block leading-none" style={{ fontSize: 22 }}>
          search
        </span>
      </span>
      <input
        ref={inputRef}
        type="text"
        className={`h-full min-w-0 flex-1 border-0 bg-transparent px-0 text-base text-on-surface outline-none placeholder:text-mono-grey focus:ring-0 ${inputClassName}`.trim()}
        {...props}
      />
      <div className="flex h-full shrink-0 items-center gap-2 px-3">
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md p-1 text-mono-grey hover:bg-surface-container hover:text-on-surface"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined block" style={{ fontSize: 16 }}>
              close
            </span>
          </button>
        )}
        {shortcut && (
          <div className="pointer-events-none">
            <ShortcutHint shortcut={shortcut} />
          </div>
        )}
      </div>
    </div>
  );
}
