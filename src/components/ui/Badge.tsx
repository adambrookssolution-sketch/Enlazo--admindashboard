interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
  },
  success: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  warning: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  error: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  info: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  purple: {
    backgroundColor: '#F3E8FF',
    color: '#7C3AED',
  },
};

const sizeStyles = {
  sm: {
    padding: '2px 8px',
    fontSize: '11px',
  },
  md: {
    padding: '4px 12px',
    fontSize: '13px',
  },
};

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: "'Centrale Sans Rounded', sans-serif",
        fontWeight: 500,
        borderRadius: '20px',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {children}
    </span>
  );
}
