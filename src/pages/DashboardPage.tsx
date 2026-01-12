import { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  FileText,
  MessageSquareQuote,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stats {
  totalUsers: number;
  totalSpecialists: number;
  approvedSpecialists: number;
  pendingSpecialists: number;
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  totalQuotes: number;
  acceptedQuotes: number;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, bgColor, subtitle }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #F3F4F6',
        transition: 'box-shadow 0.2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p
            style={{
              fontFamily: "'Centrale Sans Rounded', sans-serif",
              fontSize: '14px',
              fontWeight: 500,
              color: '#6B7280',
              margin: 0
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontFamily: "'Isidora Alt Bold', sans-serif",
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#36004E',
              margin: '8px 0 0 0'
            }}
          >
            {value.toLocaleString()}
          </p>
          {subtitle && (
            <p
              style={{
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                fontSize: '13px',
                color: '#9CA3AF',
                margin: '4px 0 0 0'
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          style={{
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: bgColor
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface RecentActivityItem {
  id: string;
  type: 'user' | 'specialist' | 'request' | 'quote';
  title: string;
  subtitle: string;
  time: string;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSpecialists: 0,
    approvedSpecialists: 0,
    pendingSpecialists: 0,
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalQuotes: 0,
    acceptedQuotes: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadRecentActivity();
  }, []);

  async function loadStats() {
    try {
      const [
        usersResult,
        specialistsResult,
        pendingSpecialistsResult,
        requestsResult,
        activeRequestsResult,
        completedRequestsResult,
        quotesResult,
        acceptedQuotesResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('specialist_profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('specialist_profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('quotes').select('*', { count: 'exact', head: true }),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
      ]);

      // Log errors for debugging
      if (usersResult.error) console.error('Users error:', usersResult.error);
      if (specialistsResult.error) console.error('Specialists error:', specialistsResult.error);
      if (pendingSpecialistsResult.error) console.error('Pending specialists error:', pendingSpecialistsResult.error);
      if (requestsResult.error) console.error('Requests error:', requestsResult.error);
      if (activeRequestsResult.error) console.error('Active requests error:', activeRequestsResult.error);
      if (completedRequestsResult.error) console.error('Completed requests error:', completedRequestsResult.error);
      if (quotesResult.error) console.error('Quotes error:', quotesResult.error);
      if (acceptedQuotesResult.error) console.error('Accepted quotes error:', acceptedQuotesResult.error);

      setStats({
        totalUsers: usersResult.count || 0,
        totalSpecialists: (specialistsResult.count || 0) + (pendingSpecialistsResult.count || 0),
        approvedSpecialists: specialistsResult.count || 0,
        pendingSpecialists: pendingSpecialistsResult.count || 0,
        totalRequests: requestsResult.count || 0,
        activeRequests: activeRequestsResult.count || 0,
        completedRequests: completedRequestsResult.count || 0,
        totalQuotes: quotesResult.count || 0,
        acceptedQuotes: acceptedQuotesResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentActivity() {
    try {
      const { data: recentSpecialists } = await supabase
        .from('specialist_profiles')
        .select('id, created_at, status, user_id')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: recentRequests } = await supabase
        .from('service_requests')
        .select('id, created_at, activity, status')
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivityItem[] = [];

      recentSpecialists?.forEach(sp => {
        activities.push({
          id: sp.id,
          type: 'specialist',
          title: sp.status === 'pending' ? 'Nuevo especialista pendiente' : 'Especialista registrado',
          subtitle: `Estado: ${sp.status}`,
          time: formatTimeAgo(sp.created_at),
        });
      });

      recentRequests?.forEach(req => {
        activities.push({
          id: req.id,
          type: 'request',
          title: req.activity || 'Solicitud de servicio',
          subtitle: `Estado: ${req.status}`,
          time: formatTimeAgo(req.created_at),
        });
      });

      activities.sort((a, b) => {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });

      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX');
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '256px'
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '4px solid rgba(170,27,241,0.3)',
            borderTopColor: '#AA1BF1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Grid - Primary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}
      >
        <StatCard
          title="Total Usuarios"
          value={stats.totalUsers}
          icon={<Users style={{ width: '24px', height: '24px', color: 'white' }} />}
          bgColor="#009AFF"
        />
        <StatCard
          title="Especialistas Aprobados"
          value={stats.approvedSpecialists}
          icon={<UserCheck style={{ width: '24px', height: '24px', color: 'white' }} />}
          bgColor="#22C55E"
          subtitle={`${stats.pendingSpecialists} pendientes`}
        />
        <StatCard
          title="Solicitudes Activas"
          value={stats.activeRequests}
          icon={<FileText style={{ width: '24px', height: '24px', color: 'white' }} />}
          bgColor="#FF9601"
          subtitle={`${stats.totalRequests} total`}
        />
        <StatCard
          title="Cotizaciones"
          value={stats.totalQuotes}
          icon={<MessageSquareQuote style={{ width: '24px', height: '24px', color: 'white' }} />}
          bgColor="#AA1BF1"
          subtitle={`${stats.acceptedQuotes} aceptadas`}
        />
      </div>

      {/* Stats Grid - Secondary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}
      >
        <StatCard
          title="Trabajos Completados"
          value={stats.completedRequests}
          icon={<CheckCircle style={{ width: '24px', height: '24px', color: 'white' }} />}
          bgColor="#16A34A"
        />
        <StatCard
          title="Especialistas Pendientes"
          value={stats.pendingSpecialists}
          icon={<Clock style={{ width: '24px', height: '24px', color: 'white' }} />}
          bgColor="#EAB308"
        />
        <StatCard
          title="Total Especialistas"
          value={stats.totalSpecialists}
          icon={<Users style={{ width: '24px', height: '24px', color: 'white' }} />}
          bgColor="#36004E"
        />
      </div>

      {/* Recent Activity */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #F3F4F6'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div
            style={{
              padding: '10px',
              backgroundColor: 'rgba(170,27,241,0.1)',
              borderRadius: '10px'
            }}
          >
            <Activity style={{ width: '20px', height: '20px', color: '#AA1BF1' }} />
          </div>
          <h2
            style={{
              fontFamily: "'Isidora Alt Bold', sans-serif",
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#36004E',
              margin: 0
            }}
          >
            Actividad Reciente
          </h2>
        </div>

        {recentActivity.length === 0 ? (
          <p
            style={{
              fontFamily: "'Centrale Sans Rounded', sans-serif",
              fontSize: '14px',
              color: '#6B7280',
              textAlign: 'center',
              padding: '32px 0'
            }}
          >
            No hay actividad reciente
          </p>
        ) : (
          <div>
            {recentActivity.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '12px',
                  marginBottom: index < recentActivity.length - 1 ? '12px' : 0,
                  transition: 'background-color 0.2s'
                }}
              >
                <div
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: item.type === 'specialist' ? '#DCFCE7' :
                      item.type === 'request' ? '#FFEDD5' :
                      item.type === 'user' ? '#DBEAFE' : '#F3E8FF'
                  }}
                >
                  {item.type === 'specialist' ? (
                    <UserCheck style={{ width: '20px', height: '20px', color: '#16A34A' }} />
                  ) : item.type === 'request' ? (
                    <FileText style={{ width: '20px', height: '20px', color: '#EA580C' }} />
                  ) : item.type === 'user' ? (
                    <Users style={{ width: '20px', height: '20px', color: '#2563EB' }} />
                  ) : (
                    <MessageSquareQuote style={{ width: '20px', height: '20px', color: '#9333EA' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#36004E',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '13px',
                      color: '#6B7280',
                      margin: '2px 0 0 0'
                    }}
                  >
                    {item.subtitle}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontSize: '13px',
                    color: '#9CA3AF',
                    flexShrink: 0
                  }}
                >
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
