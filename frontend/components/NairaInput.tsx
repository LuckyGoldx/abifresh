'use client';

interface NairaInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function NairaInput({ value, onChange, className = '', placeholder = 'Enter amount', required = false, disabled = false }: NairaInputProps) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const val = e.target.value.replace(/[^0-9.]/g, '');
        const parts = val.split('.');
        if (parts.length <= 2) {
          onChange(parts.length === 2 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0]);
        }
      }}
      className={`input ${className}`}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}
