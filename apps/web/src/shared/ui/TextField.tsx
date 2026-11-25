type TextFieldProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password';
  autoComplete?: string;
  autoCapitalize?: string;
  autoCorrect?: string;
  spellCheck?: boolean;
  placeholder?: string;
  helperText?: string;
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
  required = false,
}: TextFieldProps) {
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
        aria-describedby={helperText ? `${id}-helper` : undefined}
      />
      {helperText ? <span className="field-helper" id={`${id}-helper`}>{helperText}</span> : null}
    </div>
  );
}
