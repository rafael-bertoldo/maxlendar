type TextFieldProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'date' | 'time';
  autoComplete?: string;
  autoCapitalize?: string;
  autoCorrect?: string;
  spellCheck?: boolean;
  placeholder?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
};

export function TextField({
  id,
  label,
  name,
  value,
  onChange,
  type = 'text',
  autoComplete,
  autoCapitalize,
  autoCorrect,
  spellCheck,
  placeholder,
  helperText,
  error,
  required = false,
}: TextFieldProps) {
  const describedBy = [helperText ? `${id}-helper` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        spellCheck={spellCheck}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {helperText ? <span className="field-helper" id={`${id}-helper`}>{helperText}</span> : null}
      {error ? <span className="field-error" id={`${id}-error`}>{error}</span> : null}
    </div>
  );
}
