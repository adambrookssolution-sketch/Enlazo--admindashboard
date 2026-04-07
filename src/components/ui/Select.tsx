import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ value, onChange, options, placeholder = 'Seleccionar...' }: SelectProps) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          width: '100%',
          padding: '12px 40px 12px 16px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          backgroundColor: 'white',
          fontFamily: "'Centrale Sans Rounded', sans-serif",
          fontSize: '14px',
          color: value ? '#36004E' : '#9CA3AF',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#AA1BF1';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(170, 27, 241, 0.1)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#E5E7EB';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        style={{
          position: 'absolute',
          right: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '18px',
          height: '18px',
          color: '#9CA3AF',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
