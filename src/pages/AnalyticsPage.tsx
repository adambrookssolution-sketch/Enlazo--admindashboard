import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  MessageSquareQuote,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui';

// ── Constants ──────────────────────────────────────────────────────────────────

const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;

const GENDER_COLORS: Record<string, string> = {
  Masculino: '#009AFF',
  Femenino: '#AA1BF1',
  Otro: '#FF9601',
  'Sin especificar': '#9CA3AF',
};

const GENDER_KEYS = ['Masculino', 'Femenino', 'Otro', 'Sin especificar'];

type TabKey = 'general' | 'usuarios' | 'especialistas' | 'cotizaciones' | 'solicitudes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'especialistas', label: 'Especialistas' },
  { key: 'cotizaciones', label: 'Cotizaciones' },
  { key: 'solicitudes', label: 'Solicitudes' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function ageGroup(age: number | null): string | null {
  if (age == null) return null;
  if (age >= 18 && age <= 24) return '18-24';
  if (age >= 25 && age <= 34) return '25-34';
  if (age >= 35 && age <= 44) return '35-44';
  if (age >= 45 && age <= 54) return '45-54';
  if (age >= 55 && age <= 64) return '55-64';
  if (age >= 65) return '65+';
  return null;
}

function normalizeGender(g: string | null | undefined): string {
  if (!g) return 'Sin especificar';
  const low = g.toLowerCase();
  if (low === 'masculino') return 'Masculino';
  if (low === 'femenino') return 'Femenino';
  if (low === 'otro') return 'Otro';
  return 'Sin especificar';
}

// ── Shared interfaces ──────────────────────────────────────────────────────────

interface ProfileRow {
  gender: string | null;
  date_of_birth: string | null;
}

interface GeneralData {
  totalUsers: number;
  newUsersThisMonth: number;
  userGrowthPercent: number;
  totalSpecialists: number;
  approvedSpecialists: number;
  pendingSpecialists: number;
  approvalRate: number;
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  completionRate: number;
  totalQuotes: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
  conversionRate: number;
  avgQuotesPerRequest: number;
  categoryDistribution: { category: string; count: number }[];
}

// ── Stat Card (reused from original) ───────────────────────────────────────────

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
        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: color + '15' }}>
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
      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: '0 0 4px 0' }}>
        {title}
      </p>
      <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '28px', fontWeight: 'bold', color: '#36004E', margin: 0 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && (
        <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0 0' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ── Big Number Card ────────────────────────────────────────────────────────────

function BigNumberCard({ label, value, secondaryLabel, secondaryValue }: { label: string; value: number; secondaryLabel?: string; secondaryValue?: number }) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #F3F4F6',
        textAlign: 'center',
      }}
    >
      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: '0 0 8px 0' }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '48px', fontWeight: 'bold', color: '#36004E', margin: 0 }}>
        {value.toLocaleString()}
      </p>
      {secondaryLabel != null && secondaryValue != null && (
        <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#AA1BF1', margin: '8px 0 0 0' }}>
          {secondaryLabel}: {secondaryValue.toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ── Gender Pie Chart ───────────────────────────────────────────────────────────

function GenderPieChart({ profiles, title }: { profiles: ProfileRow[]; title: string }) {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    GENDER_KEYS.forEach((k) => (map[k] = 0));
    profiles.forEach((p) => {
      const g = normalizeGender(p.gender);
      map[g] = (map[g] || 0) + 1;
    });
    return GENDER_KEYS.map((k) => ({ name: k, value: map[k] || 0 })).filter((d) => d.value > 0);
  }, [profiles]);

  const total = profiles.length;

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
      <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 16px 0' }}>
        {title}
      </h4>
      {data.length === 0 ? (
        <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>
          Sin datos
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(1)}%`} labelLine={true}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={GENDER_COLORS[entry.name] || '#9CA3AF'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [`${value} (${total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0}%)`, 'Cantidad']}
              contentStyle={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px' }}
            />
            <Legend
              formatter={(value: string) => <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#36004E' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Age+Gender Bar Chart ───────────────────────────────────────────────────────

function AgeGenderBarChart({ profiles, title }: { profiles: ProfileRow[]; title: string }) {
  const data = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    AGE_GROUPS.forEach((ag) => {
      matrix[ag] = {};
      GENDER_KEYS.forEach((g) => (matrix[ag][g] = 0));
    });
    profiles.forEach((p) => {
      const age = calcAge(p.date_of_birth);
      const ag = ageGroup(age);
      if (!ag) return;
      const g = normalizeGender(p.gender);
      matrix[ag][g] = (matrix[ag][g] || 0) + 1;
    });
    return AGE_GROUPS.map((ag) => ({ ageGroup: ag, ...matrix[ag] }));
  }, [profiles]);

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
      <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 16px 0' }}>
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="ageGroup" tick={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: 12, fill: '#6B7280' }} />
          <YAxis allowDecimals={false} tick={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: 12, fill: '#6B7280' }} />
          <Tooltip contentStyle={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px' }} />
          <Legend
            formatter={(value: string) => <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#36004E' }}>{value}</span>}
          />
          {GENDER_KEYS.map((g) => (
            <Bar key={g} dataKey={g} fill={GENDER_COLORS[g]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Age Pie Chart with Gender filter ───────────────────────────────────────────

function AgePieWithGenderFilter({ profiles, title }: { profiles: ProfileRow[]; title: string }) {
  const [genderFilter, setGenderFilter] = useState<string>('Todos');

  const data = useMemo(() => {
    const filtered = genderFilter === 'Todos' ? profiles : profiles.filter((p) => normalizeGender(p.gender) === genderFilter);
    const map: Record<string, number> = {};
    AGE_GROUPS.forEach((ag) => (map[ag] = 0));
    filtered.forEach((p) => {
      const age = calcAge(p.date_of_birth);
      const ag = ageGroup(age);
      if (ag) map[ag] = (map[ag] || 0) + 1;
    });
    return AGE_GROUPS.map((ag) => ({ name: ag, value: map[ag] || 0 })).filter((d) => d.value > 0);
  }, [profiles, genderFilter]);

  const AGE_COLORS = ['#AA1BF1', '#009AFF', '#FF9601', '#22C55E', '#EF4444', '#8B5CF6'];
  const total = data.reduce((s, d) => s + d.value, 0);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: 0 }}>
          {title}
        </h4>
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          style={{
            fontFamily: "'Centrale Sans Rounded', sans-serif",
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            color: '#36004E',
            backgroundColor: 'white',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="Todos">Todos los generos</option>
          {GENDER_KEYS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      {data.length === 0 ? (
        <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>
          Sin datos
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(1)}%`} labelLine={true}>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={AGE_COLORS[i % AGE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [`${value} (${total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0}%)`, 'Cantidad']}
              contentStyle={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px' }}
            />
            <Legend
              formatter={(value: string) => <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#36004E' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Section Component (reusable for all 4 demographic tabs) ────────────────────

function DemographicSection({
  sectionTitle,
  totalLabel,
  totalValue,
  secondaryLabel,
  secondaryValue,
  profiles,
  genderPieTitle,
  barTitle,
  agePieTitle,
}: {
  sectionTitle: string;
  totalLabel: string;
  totalValue: number;
  secondaryLabel?: string;
  secondaryValue?: number;
  profiles: ProfileRow[];
  genderPieTitle: string;
  barTitle: string;
  agePieTitle: string;
}) {
  return (
    <div>
      <h2 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '22px', color: '#36004E', margin: '0 0 24px 0' }}>
        {sectionTitle}
      </h2>

      {/* Row 1: Big number + Gender pie */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,1fr) minmax(300px,2fr)', gap: '24px', marginBottom: '24px' }}>
        <BigNumberCard label={totalLabel} value={totalValue} secondaryLabel={secondaryLabel} secondaryValue={secondaryValue} />
        <GenderPieChart profiles={profiles} title={genderPieTitle} />
      </div>

      {/* Row 2: Bar chart */}
      <div style={{ marginBottom: '24px' }}>
        <AgeGenderBarChart profiles={profiles} title={barTitle} />
      </div>

      {/* Row 3: Age pie with gender filter */}
      <div>
        <AgePieWithGenderFilter profiles={profiles} title={agePieTitle} />
      </div>
    </div>
  );
}

// ── General Tab (existing metrics) ─────────────────────────────────────────────

function GeneralSection({ data }: { data: GeneralData }) {
  return (
    <div>
      <h2 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '22px', color: '#36004E', margin: '0 0 24px 0' }}>
        Metricas Generales
      </h2>

      {/* Main Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
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
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#009AFF' }}>{data.activeRequests}</span>
              </div>
              <ProgressBar value={data.activeRequests} max={data.totalRequests} color="#009AFF" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Completadas</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#22C55E' }}>{data.completedRequests}</span>
              </div>
              <ProgressBar value={data.completedRequests} max={data.totalRequests} color="#22C55E" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Canceladas</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#EF4444' }}>{data.cancelledRequests}</span>
              </div>
              <ProgressBar value={data.cancelledRequests} max={data.totalRequests} color="#EF4444" />
            </div>
          </div>
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Tasa de Completitud</span>
              <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#22C55E' }}>{data.completionRate}%</span>
            </div>
          </div>
        </Card>

        {/* Quote Conversion */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '10px', backgroundColor: 'rgba(170,27,241,0.1)', borderRadius: '10px' }}>
              <PieChartIcon style={{ width: '20px', height: '20px', color: '#AA1BF1' }} />
            </div>
            <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '18px', color: '#36004E', margin: 0 }}>
              Conversion de Cotizaciones
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Aceptadas</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#22C55E' }}>{data.acceptedQuotes}</span>
              </div>
              <ProgressBar value={data.acceptedQuotes} max={data.totalQuotes} color="#22C55E" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>Rechazadas</span>
                <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#EF4444' }}>{data.rejectedQuotes}</span>
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
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Tasa de Conversion</p>
              <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#AA1BF1', margin: 0 }}>{data.conversionRate}%</p>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Cotizaciones/Solicitud</p>
              <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#36004E', margin: 0 }}>{data.avgQuotesPerRequest}</p>
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
                    <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#36004E', fontWeight: 500 }}>{item.category}</span>
                    <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>{item.count} solicitudes</span>
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
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#2563EB' }}>{data.totalSpecialists}</span>
              </div>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>Total Registrados</p>
            </div>
            <ArrowRight style={{ width: '24px', height: '24px', color: '#D1D5DB' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#D97706' }}>{data.pendingSpecialists}</span>
              </div>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>Pendientes</p>
            </div>
            <ArrowRight style={{ width: '24px', height: '24px', color: '#D1D5DB' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#16A34A' }}>{data.approvedSpecialists}</span>
              </div>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>Aprobados</p>
            </div>
            <div style={{ padding: '16px 24px', backgroundColor: '#F9FAFB', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Tasa de Aprobacion</p>
              <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '28px', color: '#22C55E', margin: 0 }}>{data.approvalRate}%</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [loading, setLoading] = useState(true);

  // General data
  const [generalData, setGeneralData] = useState<GeneralData | null>(null);

  // Usuarios data
  const [userProfiles, setUserProfiles] = useState<ProfileRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  // Especialistas data
  const [specialistProfiles, setSpecialistProfiles] = useState<ProfileRow[]>([]);
  const [totalSpecialists, setTotalSpecialists] = useState(0);

  // Cotizaciones data
  const [quoteSpecialistProfiles, setQuoteSpecialistProfiles] = useState<ProfileRow[]>([]);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [completedQuotes, setCompletedQuotes] = useState(0);

  // Solicitudes data
  const [requestUserProfiles, setRequestUserProfiles] = useState<ProfileRow[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [completedRequests, setCompletedRequests] = useState(0);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      await Promise.all([loadGeneralData(), loadUsuariosData(), loadEspecialistasData(), loadCotizacionesData(), loadSolicitudesData()]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadGeneralData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

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

    const categoryMap = new Map<string, number>();
    ((allRequestsForCategories as any).data || []).forEach((req: any) => {
      const count = categoryMap.get(req.category) || 0;
      categoryMap.set(req.category, count + 1);
    });
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const tu = (usersResult as any).count || 0;
    const num = (newUsersResult as any).count || 0;
    const ts = (specialistsResult as any).count || 0;
    const as2 = (approvedSpecialistsResult as any).count || 0;
    const ps = (pendingSpecialistsResult as any).count || 0;
    const tr = (requestsResult as any).count || 0;
    const ar = (activeRequestsResult as any).count || 0;
    const cr = (completedRequestsResult as any).count || 0;
    const car = (cancelledRequestsResult as any).count || 0;
    const tq = (quotesResult as any).count || 0;
    const aq = (acceptedQuotesResult as any).count || 0;
    const rq = (rejectedQuotesResult as any).count || 0;

    setGeneralData({
      totalUsers: tu,
      newUsersThisMonth: num,
      userGrowthPercent: tu > 0 ? Math.round((num / tu) * 100) : 0,
      totalSpecialists: ts,
      approvedSpecialists: as2,
      pendingSpecialists: ps,
      approvalRate: ts > 0 ? Math.round((as2 / ts) * 100) : 0,
      totalRequests: tr,
      activeRequests: ar,
      completedRequests: cr,
      cancelledRequests: car,
      completionRate: tr > 0 ? Math.round((cr / tr) * 100) : 0,
      totalQuotes: tq,
      acceptedQuotes: aq,
      rejectedQuotes: rq,
      conversionRate: tq > 0 ? Math.round((aq / tq) * 100) : 0,
      avgQuotesPerRequest: tr > 0 ? Math.round((tq / tr) * 10) / 10 : 0,
      categoryDistribution,
    });
  }

  async function loadUsuariosData() {
    // Get all user profiles with gender and date_of_birth
    const { data, count } = await (supabase.from('profiles').select('gender, date_of_birth', { count: 'exact' }) as any);
    setUserProfiles((data || []) as ProfileRow[]);
    setTotalUsers(count || 0);
  }

  async function loadEspecialistasData() {
    // Get specialist user_ids, then fetch their profiles
    const { data: specialists } = await (supabase.from('specialist_profiles').select('user_id') as any);
    const specIds: string[] = ((specialists || []) as any[]).map((s: any) => s.user_id).filter(Boolean);
    setTotalSpecialists(specIds.length);

    if (specIds.length === 0) {
      setSpecialistProfiles([]);
      return;
    }

    // Fetch profiles for these specialist user_ids
    const { data: profiles } = await (supabase.from('profiles').select('gender, date_of_birth').in('id', specIds) as any);
    setSpecialistProfiles((profiles || []) as ProfileRow[]);
  }

  async function loadCotizacionesData() {
    // Get all quotes with specialist_id, and count completed
    const [allQuotesResult, completedQuotesResult] = await Promise.all([
      supabase.from('quotes').select('specialist_id'),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    ]);

    const allQuotes = ((allQuotesResult as any).data || []) as any[];
    setTotalQuotes(allQuotes.length);
    setCompletedQuotes((completedQuotesResult as any).count || 0);

    // Get unique specialist IDs from quotes
    const specIds = [...new Set(allQuotes.map((q: any) => q.specialist_id).filter(Boolean))] as string[];

    if (specIds.length === 0) {
      setQuoteSpecialistProfiles([]);
      return;
    }

    // Build profile lookup
    const { data: profiles } = await (supabase.from('profiles').select('id, gender, date_of_birth').in('id', specIds) as any);
    const profileMap = new Map<string, ProfileRow>();
    ((profiles || []) as any[]).forEach((p: any) => {
      profileMap.set(p.id, { gender: p.gender, date_of_birth: p.date_of_birth });
    });

    // Create one profile row per quote (so quotes are counted, not unique specialists)
    const quoteProfiles: ProfileRow[] = allQuotes.map((q: any) => {
      const profile = profileMap.get(q.specialist_id);
      return profile || { gender: null, date_of_birth: null };
    });
    setQuoteSpecialistProfiles(quoteProfiles);
  }

  async function loadSolicitudesData() {
    // Get all service_requests with user_id, and count completed
    const [allRequestsResult, completedRequestsResult] = await Promise.all([
      supabase.from('service_requests').select('user_id'),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ]);

    const allRequests = ((allRequestsResult as any).data || []) as any[];
    setTotalRequests(allRequests.length);
    setCompletedRequests((completedRequestsResult as any).count || 0);

    // Get unique user IDs
    const userIds = [...new Set(allRequests.map((r: any) => r.user_id).filter(Boolean))] as string[];

    if (userIds.length === 0) {
      setRequestUserProfiles([]);
      return;
    }

    // Build profile lookup
    const { data: profiles } = await (supabase.from('profiles').select('id, gender, date_of_birth').in('id', userIds) as any);
    const profileMap = new Map<string, ProfileRow>();
    ((profiles || []) as any[]).forEach((p: any) => {
      profileMap.set(p.id, { gender: p.gender, date_of_birth: p.date_of_birth });
    });

    // One profile row per request
    const requestProfiles: ProfileRow[] = allRequests.map((r: any) => {
      const profile = profileMap.get(r.user_id);
      return profile || { gender: null, date_of_birth: null };
    });
    setRequestUserProfiles(requestProfiles);
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

  return (
    <div>
      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '32px',
          backgroundColor: '#F3F4F6',
          borderRadius: '12px',
          padding: '4px',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              fontFamily: "'Centrale Sans Rounded', sans-serif",
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#FFFFFF' : '#6B7280',
              backgroundColor: activeTab === tab.key ? '#36004E' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flex: '1 1 auto',
              minWidth: '120px',
              textAlign: 'center',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && generalData && <GeneralSection data={generalData} />}

      {activeTab === 'usuarios' && (
        <DemographicSection
          sectionTitle="Usuarios"
          totalLabel="Total Usuarios"
          totalValue={totalUsers}
          profiles={userProfiles}
          genderPieTitle="Distribucion por Genero"
          barTitle="Usuarios por Grupo de Edad y Genero"
          agePieTitle="Distribucion por Edad (con filtro de genero)"
        />
      )}

      {activeTab === 'especialistas' && (
        <DemographicSection
          sectionTitle="Especialistas"
          totalLabel="Total Especialistas"
          totalValue={totalSpecialists}
          profiles={specialistProfiles}
          genderPieTitle="Distribucion por Genero"
          barTitle="Especialistas por Grupo de Edad y Genero"
          agePieTitle="Distribucion por Edad (con filtro de genero)"
        />
      )}

      {activeTab === 'cotizaciones' && (
        <DemographicSection
          sectionTitle="Cotizaciones"
          totalLabel="Total Cotizaciones"
          totalValue={totalQuotes}
          secondaryLabel="Completadas"
          secondaryValue={completedQuotes}
          profiles={quoteSpecialistProfiles}
          genderPieTitle="Cotizaciones por Genero del Especialista"
          barTitle="Cotizaciones por Edad del Especialista y Genero"
          agePieTitle="Cotizaciones por Edad del Especialista (con filtro de genero)"
        />
      )}

      {activeTab === 'solicitudes' && (
        <DemographicSection
          sectionTitle="Solicitudes"
          totalLabel="Total Solicitudes"
          totalValue={totalRequests}
          secondaryLabel="Completadas"
          secondaryValue={completedRequests}
          profiles={requestUserProfiles}
          genderPieTitle="Solicitudes por Genero del Usuario"
          barTitle="Solicitudes por Edad del Usuario y Genero"
          agePieTitle="Solicitudes por Edad del Usuario (con filtro de genero)"
        />
      )}
    </div>
  );
}
