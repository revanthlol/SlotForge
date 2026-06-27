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
    <div className={`relative w-full max-w-md ${wrapperClassName}`.trim()}>
      <span
        className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-mono-grey"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          search
        </span>
      </span>
      <input
        ref={inputRef}
        type="text"
        className={`academic-input h-11 w-full pl-11 ${hasValue || shortcut ? 'pr-20' : 'pr-4'} text-sm leading-none ${inputClassName}`.trim()}
        {...props}
      />
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="pointer-events-auto rounded-md p-1 text-mono-grey hover:bg-surface-container hover:text-on-surface"
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
