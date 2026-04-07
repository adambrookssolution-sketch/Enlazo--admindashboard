import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          backgroundColor: '#F3F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {icon || <Inbox style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
      </div>
      <h3
        style={{
          fontFamily: "'Isidora Alt Bold', sans-serif",
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#36004E',
          margin: '0 0 8px 0',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontFamily: "'Centrale Sans Rounded', sans-serif",
            fontSize: '14px',
            color: '#6B7280',
            margin: '0 0 20px 0',
            maxWidth: '320px',
          }}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
