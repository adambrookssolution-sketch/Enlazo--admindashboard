import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderTree,
  LogOut,
  Menu,
  X,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/usuarios', label: 'Usuarios', icon: Users },
  { path: '/aprobaciones', label: 'Aprobaciones', icon: UserCheck },
  { path: '/categorias', label: 'Categorias', icon: FolderTree },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    console.log('handleSignOut called');
    try {
      console.log('Calling signOut...');
      await signOut();
      console.log('signOut completed, navigating to /login');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect to login even if signOut fails
      console.log('Error occurred, forcing navigation to /login');
      navigate('/login');
    }
  };

  const currentPage = navItems.find(item => item.path === location.pathname);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
      {/* Mobile header */}
      <header
        className="lg:hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: 'white',
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <button
          onClick={() => setMobileMenuOpen(true)}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer'
          }}
        >
          <Menu style={{ width: '24px', height: '24px', color: '#36004E' }} />
        </button>
        <img src="/images/logo.png" alt="Enlazo" style={{ height: '32px' }} />
        <div style={{ width: '40px' }} />
      </header>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden"
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)'
            }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '288px',
              backgroundColor: '#36004E'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <img src="/images/logo.png" alt="Enlazo" style={{ height: '28px' }} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: '24px', height: '24px', color: 'white' }} />
              </button>
            </div>
            <nav style={{ padding: '16px' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      marginBottom: '8px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '15px',
                      fontWeight: 500,
                      backgroundColor: isActive ? 'white' : 'transparent',
                      color: isActive ? '#36004E' : 'rgba(255,255,255,0.8)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Icon style={{ width: '20px', height: '20px' }} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 40,
          flexDirection: 'column',
          backgroundColor: '#36004E',
          transition: 'width 0.3s ease',
          width: sidebarOpen ? '256px' : '80px'
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={sidebarOpen ? '/images/logo.png' : '/images/logo-icon.png'}
            alt="Enlazo"
            style={{
              height: '30px'
            }}
          />
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                  fontSize: '15px',
                  fontWeight: 500,
                  backgroundColor: isActive ? 'white' : 'transparent',
                  color: isActive ? '#36004E' : 'rgba(255,255,255,0.8)',
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.2s',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center'
                }}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute',
            right: '-14px',
            top: '80px',
            width: '28px',
            height: '28px',
            backgroundColor: 'white',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <ChevronLeft
            style={{
              width: '16px',
              height: '16px',
              color: '#36004E',
              transition: 'transform 0.3s',
              transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)'
            }}
          />
        </button>

        {/* User section */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              justifyContent: sidebarOpen ? 'flex-start' : 'center'
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF9601 0%, #AA1BF1 50%, #009AFF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontFamily: "'Isidora Alt Bold', sans-serif",
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              {profile?.first_name?.[0] || 'A'}
            </div>
            {sidebarOpen && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    color: 'white',
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontWeight: 500,
                    fontSize: '14px',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {profile?.first_name || 'Admin'}
                </p>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontSize: '12px',
                    margin: 0
                  }}
                >
                  Administrador
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Logout button clicked');
              await handleSignOut();
            }}
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              width: '100%',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.9)',
              fontFamily: "'Centrale Sans Rounded', sans-serif",
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              position: 'relative',
              zIndex: 10
            }}
            title={!sidebarOpen ? 'Cerrar sesion' : undefined}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <LogOut style={{ width: '20px', height: '20px' }} />
            {sidebarOpen && <span>Cerrar sesion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          transition: 'margin-left 0.3s ease',
          marginLeft: 0
        }}
        className={sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
      >
        {/* Desktop header */}
        <header
          className="hidden lg:flex"
          style={{
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            borderBottom: '1px solid #E5E7EB',
            padding: '20px 32px'
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Isidora Alt Bold', sans-serif",
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#36004E',
                margin: 0
              }}
            >
              {currentPage?.label || 'Admin'}
            </h1>
            <p
              style={{
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                fontSize: '14px',
                color: '#6B7280',
                margin: '4px 0 0 0'
              }}
            >
              Panel de administracion de Enlazo
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                fontSize: '14px',
                color: '#6B7280'
              }}
            >
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div
          style={{ padding: '32px' }}
          className="pt-20 lg:pt-8"
        >
          {children}
        </div>
      </main>

      <style>{`
        @media (min-width: 1024px) {
          .lg\\:hidden { display: none !important; }
          .hidden.lg\\:flex { display: flex !important; }
          .lg\\:ml-64 { margin-left: 256px !important; }
          .lg\\:ml-20 { margin-left: 80px !important; }
          .lg\\:pt-8 { padding-top: 32px !important; }
        }
        @media (max-width: 1023px) {
          .pt-20 { padding-top: 80px !important; }
        }
      `}</style>
    </div>
  );
}
