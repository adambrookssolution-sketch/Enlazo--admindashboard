interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles = {
  sm: { width: '32px', height: '32px', fontSize: '12px' },
  md: { width: '40px', height: '40px', fontSize: '14px' },
  lg: { width: '48px', height: '48px', fontSize: '16px' },
  xl: { width: '64px', height: '64px', fontSize: '20px' },
};

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const sizeStyle = sizeStyles[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        style={{
          ...sizeStyle,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...sizeStyle,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF9601 0%, #AA1BF1 50%, #009AFF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: "'Isidora Alt Bold', sans-serif",
        fontWeight: 'bold',
      }}
    >
      {initials}
    </div>
  );
}
