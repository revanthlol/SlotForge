import type { InputHTMLAttributes, Ref } from 'react';
import { ShortcutHint } from '../../contexts/ShortcutContext';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  wrapperClassName?: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement>;
  shortcut?: string;
}

export default function SearchInput({
  wrapperClassName = '',
  inputClassName = '',
  inputRef,
  shortcut,
  ...props
}: SearchInputProps) {
  return (
    <div className={`relative w-full max-w-md ${wrapperClassName}`.trim()}>
      <span
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-mono-grey"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          search
        </span>
      </span>
      <input
        ref={inputRef}
        type="text"
        className={`academic-input h-11 w-full pl-11 pr-10 text-sm ${inputClassName}`.trim()}
        {...props}
      />
      {shortcut && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ShortcutHint shortcut={shortcut} />
        </div>
      )}
    </div>
  );
}
