import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesion';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left side - Gradient background */}
      <div
        style={{
          display: 'none',
          width: '50%',
          background: 'linear-gradient(135deg, #FF9601 0%, #AA1BF1 50%, #009AFF 100%)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px'
        }}
        className="lg:flex"
      >
        <div style={{ maxWidth: '400px', textAlign: 'center', color: 'white' }}>
          <img
            src="/images/logo.png"
            alt="Enlazo"
            style={{
              height: '80px',
              margin: '0 auto 32px',
              filter: 'brightness(0) invert(1)'
            }}
          />
          <h1 style={{
            fontFamily: "'Isidora Alt Bold', sans-serif",
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '16px'
          }}>
            Panel de Administracion
          </h1>
          <p style={{
            fontFamily: "'Centrale Sans Rounded', sans-serif",
            fontSize: '18px',
            opacity: 0.9
          }}>
            Gestiona usuarios, especialistas y servicios de la plataforma Enlazo
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          backgroundColor: 'white'
        }}
        className="lg:w-1/2"
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <img
              src="/images/logo.png"
              alt="Enlazo"
              style={{ height: '60px', margin: '0 auto 16px' }}
            />
            <h1 style={{
              fontFamily: "'Isidora Alt Bold', sans-serif",
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#36004E'
            }}>
              Panel de Administracion
            </h1>
          </div>

          <div className="hidden lg:block" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontFamily: "'Isidora Alt Bold', sans-serif",
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#36004E',
              marginBottom: '8px'
            }}>
              Bienvenido
            </h2>
            <p style={{
              fontFamily: "'Centrale Sans Rounded', sans-serif",
              fontSize: '16px',
              color: '#6B7280'
            }}>
              Ingresa tus credenciales para acceder al panel
            </p>
          </div>

          {error && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#DC2626'
            }}>
              <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <p style={{
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                fontSize: '14px'
              }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                fontSize: '14px',
                fontWeight: 600,
                color: '#36004E',
                marginBottom: '8px'
              }}>
                Correo electronico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                  fontSize: '16px',
                  color: '#36004E',
                  backgroundColor: '#F9FAFB',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#AA1BF1'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                placeholder="admin@enlazo.com"
                required
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                fontSize: '14px',
                fontWeight: 600,
                color: '#36004E',
                marginBottom: '8px'
              }}>
                Contrasena
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 50px 14px 18px',
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontSize: '16px',
                    color: '#36004E',
                    backgroundColor: '#F9FAFB',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#AA1BF1'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff style={{ width: '20px', height: '20px' }} /> : <Eye style={{ width: '20px', height: '20px' }} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px 24px',
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                fontSize: '16px',
                fontWeight: 600,
                color: 'white',
                backgroundColor: '#36004E',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(54, 0, 78, 0.25)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#4a0068';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(54, 0, 78, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#36004E';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(54, 0, 78, 0.25)';
              }}
            >
              {loading ? (
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <>
                  <LogIn style={{ width: '20px', height: '20px' }} />
                  Iniciar sesion
                </>
              )}
            </button>
          </form>

          <p style={{
            marginTop: '32px',
            textAlign: 'center',
            fontFamily: "'Centrale Sans Rounded', sans-serif",
            fontSize: '14px',
            color: '#9CA3AF'
          }}>
            Solo usuarios con rol de administrador pueden acceder
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (min-width: 1024px) {
          .lg\\:flex { display: flex !important; }
          .lg\\:w-1\\/2 { width: 50% !important; }
          .lg\\:hidden { display: none !important; }
          .lg\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
