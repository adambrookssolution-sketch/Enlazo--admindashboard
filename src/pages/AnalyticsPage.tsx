import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  MessageSquareQuote,
  BarChart3,
  PieChart,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui';

interface AnalyticsData {
  // User metrics
  totalUsers: number;
  newUsersThisMonth: number;
  userGrowthPercent: number;

  // Specialist metrics
  totalSpecialists: number;
  approvedSpecialists: number;
  pendingSpecialists: number;
  approvalRate: number;

  // Request metrics
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  completionRate: number;

  // Quote metrics
  totalQuotes: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
  conversionRate: number;
  avgQuotesPerRequest: number;

  // Category distribution
  categoryDistribution: { category: string; count: number }[];

  // Monthly trends
  monthlyRequests: { month: string; count: number }[];
  monthlyQuotes: { month: string; count: number }[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: string;
}

function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #F3F4F6',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div
          style={{
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: color + '15',
          }}
        >
          {icon}
        </div>
        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: trend.isPositive ? '#DCFCE7' : '#FEE2E2',
            }}
          >
            {trend.isPositive ? (
              <TrendingUp style={{ width: '14px', height: '14px', color: '#16A34A' }} />
            ) : (
              <TrendingDown style={{ width: '14px', height: '14px', color: '#DC2626' }} />
            )}
            <span
              style={{
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                color: trend.isPositive ? '#166534' : '#991B1B',
              }}
            >
              {trend.value}%
            </span>
          </div>
        )}
      </div>
      <p
        style={{
          fontFamily: "'Centrale Sans Rounded', sans-serif",
          fontSize: '14px',
          color: '#6B7280',
          margin: '0 0 4px 0',
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: "'Isidora Alt Bold', sans-serif",
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#36004E',
          margin: 0,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && (
        <p
          style={{
            fontFamily: "'Centrale Sans Rounded', sans-serif",
            fontSize: '13px',
            color: '#9CA3AF',
            margin: '4px 0 0 0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div
      style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#F3F4F6',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '4px',
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);

      // Get current date info
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Parallel queries for all metrics
      const [
        usersResult,
        newUsersResult,
        specialistsResult,
        approvedSpecialistsResult,
        pendingSpecialistsResult,
        requestsResult,
        activeRequestsResult,
        completedRequestsResult,
        cancelledRequestsResult,
        quotesResult,
        acceptedQuotesResult,
        rejectedQuotesResult,
        allRequestsForCategories,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
        supabase.from('specialist_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('specialist_profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('specialist_profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('quotes').select('*', { count: 'exact', head: true }),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('service_requests').select('category'),
      ]);

      // Calculate category distribution
      const categoryMap = new Map<string, number>();
      (allRequestsForCategories.data || []).forEach((req) => {
        const count = categoryMap.get(req.category) || 0;
        categoryMap.set(req.category, count + 1);
      });
      const categoryDistribution = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Calculate metrics
      const totalUsers = usersResult.count || 0;
      const newUsersThisMonth = newUsersResult.count || 0;
      const totalSpecialists = specialistsResult.count || 0;
      const approvedSpecialists = approvedSpecialistsResult.count || 0;
      const pendingSpecialists = pendingSpecialistsResult.count || 0;
      const totalRequests = requestsResult.count || 0;
      const activeRequests = activeRequestsResult.count || 0;
      const completedRequests = completedRequestsResult.count || 0;
      const cancelledRequests = cancelledRequestsResult.count || 0;
      const totalQuotes = quotesResult.count || 0;
      const acceptedQuotes = acceptedQuotesResult.count || 0;
      const rejectedQuotes = rejectedQuotesResult.count || 0;

      setData({
        totalUsers,
        newUsersThisMonth,
        userGrowthPercent: totalUsers > 0 ? Math.round((newUsersThisMonth / totalUsers) * 100) : 0,
        totalSpecialists,
        approvedSpecialists,
        pendingSpecialists,
        approvalRate: totalSpecialists > 0 ? Math.round((approvedSpecialists / totalSpecialists) * 100) : 0,
        totalRequests,
        activeRequests,
        completedRequests,
        cancelledRequests,
        completionRate: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0,
        totalQuotes,
        acceptedQuotes,
        rejectedQuotes,
        conversionRate: totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0,
        avgQuotesPerRequest: totalRequests > 0 ? Math.round((totalQuotes / totalRequests) * 10) / 10 : 0,
        categoryDistribution,
        monthlyRequests: [],
        monthlyQuotes: [],
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '4px solid rgba(170,27,241,0.3)',
            borderTopColor: '#AA1BF1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      {/* Main Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        <StatCard
          title="Total Usuarios"
          value={data.totalUsers}
          subtitle={`+${data.newUsersThisMonth} este mes`}
          icon={<Users style={{ width: '24px', height: '24px', color: '#009AFF' }} />}
          trend={{ value: data.userGrowthPercent, isPositive: true }}
          color="#009AFF"
        />
        <StatCard
          title="Especialistas Activos"
          value={data.approvedSpecialists}
          subtitle={`${data.pendingSpecialists} pendientes`}
          icon={<Users style={{ width: '24px', height: '24px', color: '#22C55E' }} />}
          color="#22C55E"
        />
        <StatCard
          title="Solicitudes Totales"
          value={data.totalRequests}
          subtitle={`${data.activeRequests} activas`}
          icon={<FileText style={{ width: '24px', height: '24px', color: '#FF9601' }} />}
          color="#FF9601"
        />
        <StatCard
          title="Cotizaciones"
          value={data.totalQuotes}
          subtitle={`${data.acceptedQuotes} aceptadas`}
          icon={<MessageSquareQuote style={{ width: '24px', height: '24px', color: '#AA1BF1' }} />}
          color="#AA1BF1"
        />
      </div>

      {/* Conversion Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Request Status Breakdown */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '10px', backgroundColor: 'rgba(255,150,1,0.1)', borderRadius: '10px' }}>
              <BarChart3 style={{ width: '20px', height: '20px', color: '#FF9601' }} />
            </div>
            <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '18px', color: '#36004E', margin: 0 }}>
              Estado de Solicitudes
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Activas</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#009AFF' }}>
                  {data.activeRequests}
                </span>
              </div>
              <ProgressBar value={data.activeRequests} max={data.totalRequests} color="#009AFF" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Completadas</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#22C55E' }}>
                  {data.completedRequests}
                </span>
              </div>
              <ProgressBar value={data.completedRequests} max={data.totalRequests} color="#22C55E" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Canceladas</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#EF4444' }}>
                  {data.cancelledRequests}
                </span>
              </div>
              <ProgressBar value={data.cancelledRequests} max={data.totalRequests} color="#EF4444" />
            </div>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>
                Tasa de Completitud
              </span>
              <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#22C55E' }}>
                {data.completionRate}%
              </span>
            </div>
          </div>
        </Card>

        {/* Quote Conversion */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '10px', backgroundColor: 'rgba(170,27,241,0.1)', borderRadius: '10px' }}>
              <PieChart style={{ width: '20px', height: '20px', color: '#AA1BF1' }} />
            </div>
            <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '18px', color: '#36004E', margin: 0 }}>
              Conversion de Cotizaciones
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Aceptadas</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#22C55E' }}>
                  {data.acceptedQuotes}
                </span>
              </div>
              <ProgressBar value={data.acceptedQuotes} max={data.totalQuotes} color="#22C55E" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Rechazadas</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#EF4444' }}>
                  {data.rejectedQuotes}
                </span>
              </div>
              <ProgressBar value={data.rejectedQuotes} max={data.totalQuotes} color="#EF4444" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Pendientes</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#F59E0B' }}>
                  {data.totalQuotes - data.acceptedQuotes - data.rejectedQuotes}
                </span>
              </div>
              <ProgressBar value={data.totalQuotes - data.acceptedQuotes - data.rejectedQuotes} max={data.totalQuotes} color="#F59E0B" />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>
                Tasa de Conversion
              </p>
              <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#AA1BF1', margin: 0 }}>
                {data.conversionRate}%
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>
                Cotizaciones/Solicitud
              </p>
              <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#36004E', margin: 0 }}>
                {data.avgQuotesPerRequest}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '10px', backgroundColor: 'rgba(0,154,255,0.1)', borderRadius: '10px' }}>
            <BarChart3 style={{ width: '20px', height: '20px', color: '#009AFF' }} />
          </div>
          <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '18px', color: '#36004E', margin: 0 }}>
            Distribucion por Categoria
          </h3>
        </div>

        {data.categoryDistribution.length === 0 ? (
          <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', textAlign: 'center', padding: '32px 0' }}>
            No hay datos de categorias disponibles
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {data.categoryDistribution.map((item, index) => {
              const maxCount = data.categoryDistribution[0]?.count || 1;
              const colors = ['#AA1BF1', '#009AFF', '#FF9601', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
              const color = colors[index % colors.length];

              return (
                <div key={item.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#36004E', fontWeight: 500 }}>
                      {item.category}
                    </span>
                    <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>
                      {item.count} solicitudes
                    </span>
                  </div>
                  <ProgressBar value={item.count} max={maxCount} color={color} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Specialist Approval Funnel */}
      <div style={{ marginTop: '32px' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '10px', backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: '10px' }}>
              <Users style={{ width: '20px', height: '20px', color: '#22C55E' }} />
            </div>
            <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '18px', color: '#36004E', margin: 0 }}>
              Embudo de Especialistas
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#2563EB' }}>
                  {data.totalSpecialists}
                </span>
              </div>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>
                Total Registrados
              </p>
            </div>

            <ArrowRight style={{ width: '24px', height: '24px', color: '#D1D5DB' }} />

            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#D97706' }}>
                  {data.pendingSpecialists}
                </span>
              </div>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>
                Pendientes
              </p>
            </div>

            <ArrowRight style={{ width: '24px', height: '24px', color: '#D1D5DB' }} />

            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#16A34A' }}>
                  {data.approvedSpecialists}
                </span>
              </div>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>
                Aprobados
              </p>
            </div>

            <div
              style={{
                padding: '16px 24px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>
                Tasa de Aprobacion
              </p>
              <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '28px', color: '#22C55E', margin: 0 }}>
                {data.approvalRate}%
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
