import { useEffect, useState } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  DollarSign,
  Search,
  CheckCircle,
  XCircle,
  Play,
  ChevronDown,
  ChevronRight,
  Users,
  Phone,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Badge, Tabs, Modal, Button, EmptyState, Avatar } from '../components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Profile {
  id: string;
  first_name: string | null;
  last_name_paterno: string | null;
  last_name_materno: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface ServiceRequest {
  id: string;
  activity: string | null;
  category: string | null;
  status: string;
  created_at: string;
  description: string | null;
  service_description: string | null;
  service_title: string | null;
  evidence_urls: string[] | null;
  is_urgent: boolean | null;
  price_min: number | null;
  price_max: number | null;
  user_id: string;
  location_id: string | null;
  scheduled_date: string | null;
  time_preference: string | null;
  time_start: string | null;
  time_end: string | null;
  updated_at: string | null;
  profile?: Profile | null;
  location?: any;
  quotes_count?: number;
}

interface ClientGroup {
  profile: Profile;
  requests: ServiceRequest[];
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  draft:       { label: 'Borrador',     bg: '#F3F4F6', color: '#6B7280' },
  active:      { label: 'Activa',       bg: '#DCFCE7', color: '#15803D' },
  open:        { label: 'Abierta',      bg: '#DCFCE7', color: '#15803D' },
  in_progress: { label: 'En Progreso',  bg: '#DBEAFE', color: '#1D4ED8' },
  completed:   { label: 'Completada',   bg: '#F3E8FF', color: '#7C3AED' },
  cancelled:   { label: 'Cancelada',    bg: '#FEE2E2', color: '#B91C1C' },
};

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default' | 'purple'> = {
  draft: 'default',
  active: 'success',
  open: 'success',
  in_progress: 'info',
  completed: 'purple',
  cancelled: 'error',
};

function getStatusBadge(status: string) {
  const cfg = statusConfig[status] || statusConfig.draft;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: "'Centrale Sans Rounded', sans-serif",
        backgroundColor: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateString: string | null) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(min: number | null, max: number | null) {
  if (!min && !max) return 'Sin presupuesto';
  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (min) return `Desde $${min.toLocaleString()}`;
  return `Hasta $${max?.toLocaleString()}`;
}

function clientFullName(p: Profile): string {
  return [p.first_name, p.last_name_paterno, p.last_name_materno].filter(Boolean).join(' ') || p.display_name || 'Sin nombre';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ServiceRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState({
    all: 0,
    active: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });

  useEffect(() => {
    loadRequests();
    loadCounts();
  }, [activeTab]);

  /* ---- Data loading ---- */

  async function loadCounts() {
    const [all, active, inProgress, completed, cancelled] = await Promise.all([
      supabase.from('service_requests').select('*', { count: 'exact', head: true }),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ]);

    setCounts({
      all: (all as any).count || 0,
      active: (active as any).count || 0,
      in_progress: (inProgress as any).count || 0,
      completed: (completed as any).count || 0,
      cancelled: (cancelled as any).count || 0,
    });
  }

  async function loadRequests() {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Collect unique user_ids
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))] as string[];

      // Batch-load all profiles at once
      let profilesMap: Record<string, Profile> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, first_name, last_name_paterno, last_name_materno, display_name, avatar_url, phone')
          .in('id', userIds);

        if (profiles) {
          for (const p of profiles as Profile[]) {
            profilesMap[p.id] = p;
          }
        }
      }

      const enriched: ServiceRequest[] = (data || []).map((r: any) => ({
        ...r,
        profile: profilesMap[r.user_id] || null,
      }));

      setRequests(enriched);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateRequestStatus(requestId: string, newStatus: string) {
    try {
      const { error } = await (supabase as any)
        .from('service_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      loadRequests();
      loadCounts();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating request:', error);
    }
  }

  /* ---- Filtering & grouping ---- */

  // Group requests by client (user_id)
  function groupByClient(reqs: ServiceRequest[]): ClientGroup[] {
    const map: Record<string, ClientGroup> = {};
    for (const r of reqs) {
      const uid = r.user_id;
      if (!map[uid]) {
        map[uid] = {
          profile: r.profile || {
            id: uid,
            first_name: null,
            last_name_paterno: null,
            last_name_materno: null,
            display_name: null,
            avatar_url: null,
            phone: null,
          },
          requests: [],
        };
      }
      map[uid].requests.push(r);
    }
    // Sort clients by total requests desc
    return Object.values(map).sort((a, b) => b.requests.length - a.requests.length);
  }

  // Filter by search (client name or phone)
  const searchLower = search.toLowerCase().trim();
  const filteredRequests = requests.filter((r) => {
    if (!searchLower) return true;
    const name = clientFullName(r.profile || ({} as Profile)).toLowerCase();
    const phone = (r.profile?.phone || '').toLowerCase();
    return name.includes(searchLower) || phone.includes(searchLower);
  });

  const clientGroups = groupByClient(filteredRequests);

  function toggleClient(clientId: string) {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  /* ---- Tabs ---- */

  const tabs = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'active', label: 'Activas', count: counts.active },
    { id: 'in_progress', label: 'En Progreso', count: counts.in_progress },
    { id: 'completed', label: 'Completadas', count: counts.completed },
    { id: 'cancelled', label: 'Canceladas', count: counts.cancelled },
  ];

  /* ---- Loading state ---- */

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

  /* ---- Render ---- */

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Search bar */}
      <div
        style={{
          marginBottom: '24px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '2px solid #F3F4F6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#AA1BF1';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#F3F4F6';
          }}
        >
          <Search style={{ width: '20px', height: '20px', color: '#AA1BF1', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de cliente o telefono..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              fontFamily: "'Centrale Sans Rounded', sans-serif",
              color: '#36004E',
              backgroundColor: 'transparent',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <XCircle style={{ width: '18px', height: '18px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Results summary */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Users style={{ width: '18px', height: '18px', color: '#AA1BF1' }} />
        <span
          style={{
            fontFamily: "'Centrale Sans Rounded', sans-serif",
            fontSize: '14px',
            color: '#6B7280',
          }}
        >
          {clientGroups.length} cliente{clientGroups.length !== 1 ? 's' : ''} encontrado{clientGroups.length !== 1 ? 's' : ''} &middot;{' '}
          {filteredRequests.length} solicitud{filteredRequests.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Client list */}
      {clientGroups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
            title="No hay clientes"
            description="No se encontraron clientes con los filtros actuales."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {clientGroups.map((group) => {
            const isExpanded = expandedClients.has(group.profile.id);
            const name = clientFullName(group.profile);

            return (
              <div
                key={group.profile.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: isExpanded ? '2px solid #AA1BF1' : '2px solid #F3F4F6',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: isExpanded
                    ? '0 4px 16px rgba(170,27,241,0.12)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Client row (clickable) */}
                <div
                  onClick={() => toggleClient(group.profile.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAFE';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Expand icon */}
                  <div style={{ flexShrink: 0, color: '#AA1BF1' }}>
                    {isExpanded ? (
                      <ChevronDown style={{ width: '20px', height: '20px' }} />
                    ) : (
                      <ChevronRight style={{ width: '20px', height: '20px' }} />
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar src={group.profile.avatar_url} name={group.profile.first_name || undefined} size="lg" />

                  {/* Name & phone */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: "'Isidora Alt Bold', sans-serif",
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#36004E',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {name}
                    </h3>
                    {group.profile.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <Phone style={{ width: '13px', height: '13px', color: '#9CA3AF' }} />
                        <span
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '13px',
                            color: '#6B7280',
                          }}
                        >
                          {group.profile.phone}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Request count badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      background: 'linear-gradient(135deg, #FF9601, #AA1BF1, #009AFF)',
                      color: '#FFFFFF',
                      fontFamily: "'Isidora Alt Bold', sans-serif",
                      fontSize: '13px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    <FileText style={{ width: '14px', height: '14px' }} />
                    {group.requests.length} solicitud{group.requests.length !== 1 ? 'es' : ''}
                  </div>
                </div>

                {/* Expanded: list of requests */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid #F3F4F6',
                      backgroundColor: '#FAFAFE',
                    }}
                  >
                    {group.requests.map((request, idx) => {
                      return (
                        <div
                          key={request.id}
                          onClick={() => setSelectedRequest(request)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '14px 20px 14px 72px',
                            cursor: 'pointer',
                            borderBottom: idx < group.requests.length - 1 ? '1px solid #F0F0F4' : 'none',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = '#F3EEFF';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          {/* Category & Activity */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontFamily: "'Isidora Alt Bold', sans-serif",
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#36004E',
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {request.service_title || request.activity || 'Sin titulo'}
                            </p>
                            <p
                              style={{
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                fontSize: '12px',
                                color: '#9CA3AF',
                                margin: '2px 0 0 0',
                              }}
                            >
                              {[request.category, request.activity].filter(Boolean).join(' · ')}
                            </p>
                          </div>

                          {/* Status badge */}
                          <div style={{ flexShrink: 0 }}>{getStatusBadge(request.status)}</div>

                          {/* Price range */}
                          <div style={{ flexShrink: 0, textAlign: 'right', minWidth: '120px' }}>
                            <span
                              style={{
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                fontSize: '13px',
                                color: '#36004E',
                                fontWeight: 500,
                              }}
                            >
                              {formatPrice(request.price_min, request.price_max)}
                            </span>
                          </div>

                          {/* Date */}
                          <div style={{ flexShrink: 0, minWidth: '90px', textAlign: 'right' }}>
                            <span
                              style={{
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                fontSize: '12px',
                                color: '#9CA3AF',
                              }}
                            >
                              {formatDate(request.created_at)}
                            </span>
                          </div>

                          {/* Urgent flag */}
                          {request.is_urgent && (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 600,
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                backgroundColor: '#FEE2E2',
                                color: '#B91C1C',
                                flexShrink: 0,
                              }}
                            >
                              Urgente
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Detalle de Solicitud"
        size="lg"
      >
        {selectedRequest && (
          <div>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                paddingBottom: '24px',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <Avatar
                src={selectedRequest.profile?.avatar_url}
                name={selectedRequest.profile?.first_name || undefined}
                size="xl"
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3
                    style={{
                      fontFamily: "'Isidora Alt Bold', sans-serif",
                      fontSize: '22px',
                      color: '#36004E',
                      margin: 0,
                    }}
                  >
                    {selectedRequest.service_title || selectedRequest.activity}
                  </h3>
                  <Badge variant={statusBadgeVariant[selectedRequest.status] || 'default'}>
                    {(statusConfig[selectedRequest.status] || statusConfig.draft).label}
                  </Badge>
                </div>
                <p
                  style={{
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontSize: '15px',
                    color: '#6B7280',
                    margin: 0,
                  }}
                >
                  Cliente: {clientFullName(selectedRequest.profile || ({} as Profile))}
                </p>
                {selectedRequest.profile?.phone && (
                  <p
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '14px',
                      color: '#9CA3AF',
                      margin: '4px 0 0 0',
                    }}
                  >
                    Tel: {selectedRequest.profile.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <h4
                style={{
                  fontFamily: "'Isidora Alt Bold', sans-serif",
                  fontSize: '16px',
                  color: '#36004E',
                  margin: '0 0 12px 0',
                }}
              >
                Descripcion
              </h4>
              <p
                style={{
                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                  fontSize: '14px',
                  color: '#4B5563',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {selectedRequest.service_description || selectedRequest.description || 'Sin descripcion'}
              </p>
            </div>

            {/* Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileText style={{ width: '18px', height: '18px', color: '#AA1BF1' }} />
                  <span
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '13px',
                      color: '#6B7280',
                    }}
                  >
                    Categoria
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontSize: '15px',
                    color: '#36004E',
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  {selectedRequest.category}
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <DollarSign style={{ width: '18px', height: '18px', color: '#22C55E' }} />
                  <span
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '13px',
                      color: '#6B7280',
                    }}
                  >
                    Presupuesto
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontSize: '15px',
                    color: '#36004E',
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  {formatPrice(selectedRequest.price_min, selectedRequest.price_max)}
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar style={{ width: '18px', height: '18px', color: '#FF9601' }} />
                  <span
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '13px',
                      color: '#6B7280',
                    }}
                  >
                    Fecha Programada
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontSize: '15px',
                    color: '#36004E',
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  {formatDate(selectedRequest.scheduled_date)}
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock style={{ width: '18px', height: '18px', color: '#009AFF' }} />
                  <span
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '13px',
                      color: '#6B7280',
                    }}
                  >
                    Horario
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontSize: '15px',
                    color: '#36004E',
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  {selectedRequest.time_start || selectedRequest.time_preference || 'Flexible'}
                </p>
              </div>
            </div>

            {/* Evidence Images */}
            {selectedRequest.evidence_urls && selectedRequest.evidence_urls.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4
                  style={{
                    fontFamily: "'Isidora Alt Bold', sans-serif",
                    fontSize: '16px',
                    color: '#36004E',
                    margin: '0 0 12px 0',
                  }}
                >
                  Evidencias ({selectedRequest.evidence_urls.length})
                </h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {selectedRequest.evidence_urls.map((url: string, index: number) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={url}
                        alt={`Evidencia ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                paddingTop: '24px',
                borderTop: '1px solid #F3F4F6',
              }}
            >
              {selectedRequest.status === 'active' && (
                <>
                  <Button
                    variant="secondary"
                    leftIcon={<Play style={{ width: '16px', height: '16px' }} />}
                    onClick={() => updateRequestStatus(selectedRequest.id, 'in_progress')}
                  >
                    Marcar en Progreso
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={<XCircle style={{ width: '16px', height: '16px' }} />}
                    onClick={() => updateRequestStatus(selectedRequest.id, 'cancelled')}
                  >
                    Cancelar
                  </Button>
                </>
              )}
              {selectedRequest.status === 'in_progress' && (
                <>
                  <Button
                    variant="primary"
                    leftIcon={<CheckCircle style={{ width: '16px', height: '16px' }} />}
                    onClick={() => updateRequestStatus(selectedRequest.id, 'completed')}
                  >
                    Marcar Completada
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={<XCircle style={{ width: '16px', height: '16px' }} />}
                    onClick={() => updateRequestStatus(selectedRequest.id, 'cancelled')}
                  >
                    Cancelar
                  </Button>
                </>
              )}
              {selectedRequest.status === 'cancelled' && (
                <Button
                  variant="outline"
                  leftIcon={<Play style={{ width: '16px', height: '16px' }} />}
                  onClick={() => updateRequestStatus(selectedRequest.id, 'active')}
                >
                  Reactivar
                </Button>
              )}
              <Button variant="ghost" onClick={() => setSelectedRequest(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
