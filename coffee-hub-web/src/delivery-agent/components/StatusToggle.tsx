interface StatusToggleOption<T extends string> {
  id: T;
  label: string;
}

interface StatusToggleProps<T extends string> {
  label?: string;
  onChange: (nextValue: T) => void;
  options: readonly StatusToggleOption<T>[];
  value: T;
}

export const StatusToggle = <T extends string,>({
  label,
  onChange,
  options,
  value,
}: StatusToggleProps<T>) => (
  <div className="rounded-[26px] border border-white/10 bg-white/5 p-2">
    {label && (
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-muted">
        {label}
      </p>
    )}

    <div className="grid grid-cols-2 gap-2">
      {options.map(option => (
        <button
          key={option.id}
          className={`min-h-11 rounded-2xl px-4 text-sm font-semibold transition-colors ${
            option.id === value
              ? 'bg-primary text-white'
              : 'bg-white/5 text-ink-muted'
          }`}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
