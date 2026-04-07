import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles = {
  primary: {
    backgroundColor: '#36004E',
    color: 'white',
    border: 'none',
    hoverBg: '#4A0066',
  },
  secondary: {
    backgroundColor: '#AA1BF1',
    color: 'white',
    border: 'none',
    hoverBg: '#9016D0',
  },
  outline: {
    backgroundColor: 'transparent',
    color: '#36004E',
    border: '1px solid #E5E7EB',
    hoverBg: '#F9FAFB',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: 'none',
    hoverBg: '#F3F4F6',
  },
  danger: {
    backgroundColor: '#EF4444',
    color: 'white',
    border: 'none',
    hoverBg: '#DC2626',
  },
};

const sizeStyles = {
  sm: {
    padding: '8px 14px',
    fontSize: '13px',
    borderRadius: '10px',
  },
  md: {
    padding: '10px 18px',
    fontSize: '14px',
    borderRadius: '12px',
  },
  lg: {
    padding: '14px 24px',
    fontSize: '15px',
    borderRadius: '14px',
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading,
      leftIcon,
      rightIcon,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: "'Centrale Sans Rounded', sans-serif",
          fontWeight: 500,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          opacity: disabled || isLoading ? 0.6 : 1,
          transition: 'all 0.2s',
          backgroundColor: variantStyle.backgroundColor,
          color: variantStyle.color,
          border: variantStyle.border,
          ...sizeStyle,
          ...style,
        }}
        onMouseOver={(e) => {
          if (!disabled && !isLoading) {
            e.currentTarget.style.backgroundColor = variantStyle.hoverBg;
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = variantStyle.backgroundColor;
        }}
        {...props}
      >
        {isLoading ? (
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </button>
    );
  }
);

Button.displayName = 'Button';
