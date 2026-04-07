import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: SearchInputProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '320px',
      }}
    >
      <Search
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '18px',
          height: '18px',
          color: '#9CA3AF',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 40px 12px 44px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          backgroundColor: 'white',
          fontFamily: "'Centrale Sans Rounded', sans-serif",
          fontSize: '14px',
          color: '#36004E',
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
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '4px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X style={{ width: '16px', height: '16px', color: '#9CA3AF' }} />
        </button>
      )}
    </div>
  );
}
