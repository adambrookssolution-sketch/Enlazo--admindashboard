import { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  FileText,
  MessageSquareQuote,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
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
  color: string;
  trend?: number;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, trend, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-conexion-profunda mt-2">
            {value.toLocaleString()}
          </p>
          {subtitle && (
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(trend)}% vs mes anterior</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
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
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('specialist_profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('specialist_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('service_requests').select('id', { count: 'exact', head: true }),
        supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('quotes').select('id', { count: 'exact', head: true }),
        supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
      ]);

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
      // Load recent specialists
      const { data: recentSpecialists } = await supabase
        .from('specialist_profiles')
        .select('id, created_at, status, user_id')
        .order('created_at', { ascending: false })
        .limit(3);

      // Load recent requests
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

      // Sort by time
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-morado-confianza/30 border-t-morado-confianza rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Usuarios"
          value={stats.totalUsers}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-azul-alcance"
        />
        <StatCard
          title="Especialistas Aprobados"
          value={stats.approvedSpecialists}
          icon={<UserCheck className="w-6 h-6 text-white" />}
          color="bg-green-500"
          subtitle={`${stats.pendingSpecialists} pendientes`}
        />
        <StatCard
          title="Solicitudes Activas"
          value={stats.activeRequests}
          icon={<FileText className="w-6 h-6 text-white" />}
          color="bg-enlace-vivo"
          subtitle={`${stats.totalRequests} total`}
        />
        <StatCard
          title="Cotizaciones"
          value={stats.totalQuotes}
          icon={<MessageSquareQuote className="w-6 h-6 text-white" />}
          color="bg-morado-confianza"
          subtitle={`${stats.acceptedQuotes} aceptadas`}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Trabajos Completados"
          value={stats.completedRequests}
          icon={<CheckCircle className="w-6 h-6 text-white" />}
          color="bg-green-600"
        />
        <StatCard
          title="Especialistas Pendientes"
          value={stats.pendingSpecialists}
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-yellow-500"
        />
        <StatCard
          title="Total Especialistas"
          value={stats.totalSpecialists}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-conexion-profunda"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-morado-confianza/10 rounded-lg">
            <Activity className="w-5 h-5 text-morado-confianza" />
          </div>
          <h2 className="text-xl font-bold text-conexion-profunda">Actividad Reciente</h2>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay actividad reciente</p>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className={`p-2 rounded-lg ${
                  item.type === 'specialist' ? 'bg-green-100 text-green-600' :
                  item.type === 'request' ? 'bg-orange-100 text-orange-600' :
                  item.type === 'user' ? 'bg-blue-100 text-blue-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {item.type === 'specialist' ? <UserCheck className="w-5 h-5" /> :
                   item.type === 'request' ? <FileText className="w-5 h-5" /> :
                   item.type === 'user' ? <Users className="w-5 h-5" /> :
                   <MessageSquareQuote className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-conexion-profunda truncate">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                </div>
                <span className="text-sm text-gray-400 flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
