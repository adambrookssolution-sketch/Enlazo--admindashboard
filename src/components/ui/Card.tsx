interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingStyles = {
  none: '0',
  sm: '16px',
  md: '24px',
  lg: '32px',
};

export function Card({ children, padding = 'md', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: paddingStyles[padding],
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #F3F4F6',
        transition: 'all 0.2s',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseOver={(e) => {
        if (hover || onClick) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </div>
  );
}
