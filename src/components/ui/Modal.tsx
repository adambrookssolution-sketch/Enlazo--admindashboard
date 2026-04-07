import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

const sizeStyles = {
  sm: '400px',
  md: '500px',
  lg: '700px',
  xl: '900px',
  full: '95vw',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />
      <div
        ref={modalRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: sizeStyles[size],
          maxHeight: '90vh',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalEnter 0.2s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #F3F4F6',
          }}
        >
          <h2
            style={{
              fontFamily: "'Isidora Alt Bold', sans-serif",
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#36004E',
              margin: 0,
            }}
          >
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#F3F4F6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
            >
              <X style={{ width: '20px', height: '20px', color: '#6B7280' }} />
            </button>
          )}
        </div>
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
      <style>{`
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
