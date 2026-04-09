import { useEffect, useState } from 'react';
import {
  MessageSquareQuote,
  Calendar,
  Clock,
  Shield,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Star,
  Phone,
  FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Badge, SearchInput, Tabs, Modal, Button, EmptyState, Avatar } from '../components/ui';

interface Quote {
  id: string;
  request_id: string;
  specialist_id: string;
  status: string;
  price_fixed: number | null;
  price_min: number | null;
  price_max: number | null;
  proposed_date: string | null;
  proposed_time_start: string | null;
  proposed_time_end: string | null;
  estimated_duration_hours: number | null;
  scope: string | null;
  description: string | null;
  includes_materials: boolean | null;
  materials_list: string | null;
  has_warranty: boolean | null;
  warranty_days: number | null;
  warranty_description: string | null;
  requires_visit: boolean | null;
  visit_cost: number | null;
  exclusions: string | null;
  additional_notes: string | null;
  attachments: any;
  created_at: string;
  specialist_profile?: any;
  specialist_user_profile?: any;
  service_request?: any;
  client_profile?: any;
}

interface SpecialistGroup {
  specialist_id: string;
  specialist_profile: any;
  specialist_user_profile: any;
  quotes: Quote[];
  totalQuotes: number;
  rating: number | null;
  totalReviews: number | null;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' | 'purple'; bg: string; fg: string }> = {
  pending: { label: 'Pendiente', variant: 'warning', bg: '#FEF3C7', fg: '#A16207' },
  pre_selected: { label: 'Preseleccionada', variant: 'info', bg: '#DBEAFE', fg: '#1D4ED8' },
  accepted: { label: 'Aceptada', variant: 'success', bg: '#DCFCE7', fg: '#15803D' },
  rejected: { label: 'Rechazada', variant: 'error', bg: '#FEE2E2', fg: '#B91C1C' },
};

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [expandedSpecialists, setExpandedSpecialists] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    pre_selected: 0,
    accepted: 0,
    rejected: 0,
  });

  useEffect(() => {
    loadQuotes();
    loadCounts();
  }, [activeTab]);

  async function loadCounts() {
    const [all, pending, preSelected, accepted, rejected] = await Promise.all([
      supabase.from('quotes').select('*', { count: 'exact', head: true }),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'pre_selected'),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]);

    setCounts({
      all: all.count || 0,
      pending: pending.count || 0,
      pre_selected: preSelected.count || 0,
      accepted: accepted.count || 0,
      rejected: rejected.count || 0,
    });
  }

  async function loadQuotes() {
    try {
      setLoading(true);
      let query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unique specialist IDs
      const specialistIds = [...new Set((data || []).map((q: any) => q.specialist_id).filter(Boolean))];
      const requestIds = [...new Set((data || []).map((q: any) => q.request_id).filter(Boolean))];

      // Batch fetch specialist profiles
      const { data: specialistProfiles } = specialistIds.length > 0
        ? await supabase.from('specialist_profiles').select('*').in('id', specialistIds)
        : { data: [] };

      // Batch fetch service requests
      const { data: serviceRequests } = requestIds.length > 0
        ? await supabase.from('service_requests').select('*').in('id', requestIds)
        : { data: [] };

      // Get user_ids from specialist profiles to fetch user profiles
      const specialistUserIds = [...new Set((specialistProfiles || []).map((sp: any) => sp.user_id).filter(Boolean))];
      const clientUserIds = [...new Set((serviceRequests || []).map((sr: any) => sr.user_id).filter(Boolean))];
      const allUserIds = [...new Set([...specialistUserIds, ...clientUserIds])];

      const { data: userProfiles } = allUserIds.length > 0
        ? await supabase.from('profiles').select('*').in('id', allUserIds)
        : { data: [] };

      // Build lookup maps
      const spMap = new Map((specialistProfiles || []).map((sp: any) => [sp.id, sp]));
      const srMap = new Map((serviceRequests || []).map((sr: any) => [sr.id, sr]));
      const profileMap = new Map((userProfiles || []).map((p: any) => [p.id, p]));

      const enrichedQuotes: Quote[] = (data || []).map((quote: any) => {
        const sp = spMap.get(quote.specialist_id);
        const sr = srMap.get(quote.request_id);
        const specialistUserProfile = sp ? profileMap.get(sp.user_id) : null;
        const clientProfile = sr ? profileMap.get(sr.user_id) : null;

        return {
          ...quote,
          specialist_profile: sp || null,
          specialist_user_profile: specialistUserProfile || null,
          service_request: sr || null,
          client_profile: clientProfile || null,
        };
      });

      setQuotes(enrichedQuotes);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  }

  // Group quotes by specialist
  function buildSpecialistGroups(filteredQuotes: Quote[]): SpecialistGroup[] {
    const groupMap = new Map<string, SpecialistGroup>();

    for (const quote of filteredQuotes) {
      const key = quote.specialist_id || 'unknown';
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          specialist_id: key,
          specialist_profile: quote.specialist_profile,
          specialist_user_profile: quote.specialist_user_profile,
          quotes: [],
          totalQuotes: 0,
          rating: quote.specialist_profile?.rating_promedio ?? null,
          totalReviews: quote.specialist_profile?.total_reviews ?? null,
        });
      }
      const group = groupMap.get(key)!;
      group.quotes.push(quote);
      group.totalQuotes = group.quotes.length;
    }

    // Sort by total quotes descending
    return Array.from(groupMap.values()).sort((a, b) => b.totalQuotes - a.totalQuotes);
  }

  // Filter by search (specialist name, phone, RFC)
  const filteredQuotes = quotes.filter((quote) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const firstName = quote.specialist_user_profile?.first_name?.toLowerCase() || '';
    const lastNameP = quote.specialist_user_profile?.last_name_paterno?.toLowerCase() || '';
    const lastNameM = quote.specialist_user_profile?.last_name_materno?.toLowerCase() || '';
    const displayName = quote.specialist_user_profile?.display_name?.toLowerCase() || '';
    const phone = quote.specialist_profile?.phone?.toLowerCase() || quote.specialist_user_profile?.phone?.toLowerCase() || '';
    const rfc = quote.specialist_profile?.rfc?.toLowerCase() || '';
    const fullName = `${firstName} ${lastNameP} ${lastNameM}`.trim();

    return (
      firstName.includes(s) ||
      lastNameP.includes(s) ||
      lastNameM.includes(s) ||
      fullName.includes(s) ||
      displayName.includes(s) ||
      phone.includes(s) ||
      rfc.includes(s)
    );
  });

  const specialistGroups = buildSpecialistGroups(filteredQuotes);

  function toggleSpecialist(specialistId: string) {
    setExpandedSpecialists((prev) => {
      const next = new Set(prev);
      if (next.has(specialistId)) {
        next.delete(specialistId);
      } else {
        next.add(specialistId);
      }
      return next;
    });
  }

  const tabs = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'pending', label: 'Pendientes', count: counts.pending },
    { id: 'pre_selected', label: 'Preseleccionadas', count: counts.pre_selected },
    { id: 'accepted', label: 'Aceptadas', count: counts.accepted },
    { id: 'rejected', label: 'Rechazadas', count: counts.rejected },
  ];

  function formatDate(dateString: string | null) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatPrice(quote: Quote) {
    if (quote.price_fixed) return `$${Number(quote.price_fixed).toLocaleString()}`;
    if (quote.price_min && quote.price_max) return `$${Number(quote.price_min).toLocaleString()} - $${Number(quote.price_max).toLocaleString()}`;
    if (quote.price_min) return `Desde $${Number(quote.price_min).toLocaleString()}`;
    if (quote.price_max) return `Hasta $${Number(quote.price_max).toLocaleString()}`;
    return 'Sin precio';
  }

  function getSpecialistName(group: SpecialistGroup) {
    const p = group.specialist_user_profile;
    if (p?.first_name) {
      return `${p.first_name} ${p.last_name_paterno || ''}`.trim();
    }
    if (p?.display_name) return p.display_name;
    return 'Especialista desconocido';
  }

  function getSpecialistPhone(group: SpecialistGroup) {
    return group.specialist_profile?.phone || group.specialist_user_profile?.phone || '';
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
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontFamily: "'Isidora Alt Bold', sans-serif",
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#36004E',
            margin: '0 0 4px 0',
          }}
        >
          Cotizaciones por Especialista
        </h1>
        <p
          style={{
            fontFamily: "'Centrale Sans Rounded', sans-serif",
            fontSize: '14px',
            color: '#6B7280',
            margin: 0,
          }}
        >
          Busca por especialista y visualiza todas las cotizaciones que ha enviado
        </p>
      </div>

      {/* Tabs and Search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, telefono o RFC del especialista..." />
      </div>

      {/* Specialist Groups */}
      {specialistGroups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageSquareQuote style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
            title="No hay cotizaciones"
            description="No se encontraron cotizaciones con los filtros actuales."
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {specialistGroups.map((group) => {
            const isExpanded = expandedSpecialists.has(group.specialist_id);
            const specialistName = getSpecialistName(group);
            const specialistPhone = getSpecialistPhone(group);
            const photoUrl = group.specialist_profile?.profile_photo_url || group.specialist_user_profile?.avatar_url;

            return (
              <div key={group.specialist_id}>
                {/* Specialist Row (clickable) */}
                <div
                  onClick={() => toggleSpecialist(group.specialist_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    backgroundColor: isExpanded ? '#F5F0F9' : '#FFFFFF',
                    border: isExpanded ? '2px solid #AA1BF1' : '1px solid #E5E7EB',
                    borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#AA1BF1';
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = '#FDFAFF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E7EB';
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  {/* Expand/Collapse icon */}
                  <div style={{ flexShrink: 0, color: '#AA1BF1' }}>
                    {isExpanded ? (
                      <ChevronDown style={{ width: '20px', height: '20px' }} />
                    ) : (
                      <ChevronRight style={{ width: '20px', height: '20px' }} />
                    )}
                  </div>

                  {/* Photo */}
                  <Avatar src={photoUrl} name={specialistName} size="lg" />

                  {/* Name & Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: "'Isidora Alt Bold', sans-serif",
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#36004E',
                        margin: '0 0 4px 0',
                      }}
                    >
                      {specialistName}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      {specialistPhone && (
                        <span
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '13px',
                            color: '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Phone style={{ width: '13px', height: '13px' }} />
                          {specialistPhone}
                        </span>
                      )}
                      {group.specialist_profile?.rfc && (
                        <span
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '13px',
                            color: '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <FileText style={{ width: '13px', height: '13px' }} />
                          RFC: {group.specialist_profile.rfc}
                        </span>
                      )}
                      {group.specialist_profile?.specialist_type && (
                        <span
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '12px',
                            color: '#AA1BF1',
                            backgroundColor: '#F5F0F9',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {group.specialist_profile.specialist_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    {group.rating != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <Star style={{ width: '16px', height: '16px', color: '#FBBF24', fill: '#FBBF24' }} />
                        <span
                          style={{
                            fontFamily: "'Isidora Alt Bold', sans-serif",
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#36004E',
                          }}
                        >
                          {Number(group.rating).toFixed(1)}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '11px',
                            color: '#9CA3AF',
                          }}
                        >
                          ({group.totalReviews || 0})
                        </span>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontFamily: "'Centrale Sans Rounded', sans-serif",
                          fontSize: '12px',
                          color: '#9CA3AF',
                        }}
                      >
                        Sin resenas
                      </span>
                    )}
                  </div>

                  {/* Total Quotes Count */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#36004E',
                      borderRadius: '12px',
                      minWidth: '100px',
                      justifyContent: 'center',
                    }}
                  >
                    <MessageSquareQuote style={{ width: '16px', height: '16px', color: '#FFFFFF' }} />
                    <span
                      style={{
                        fontFamily: "'Isidora Alt Bold', sans-serif",
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                      }}
                    >
                      {group.totalQuotes}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Centrale Sans Rounded', sans-serif",
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {group.totalQuotes === 1 ? 'cotizacion' : 'cotizaciones'}
                    </span>
                  </div>
                </div>

                {/* Expanded Quotes List */}
                {isExpanded && (
                  <div
                    style={{
                      border: '2px solid #AA1BF1',
                      borderTop: 'none',
                      borderRadius: '0 0 16px 16px',
                      overflow: 'hidden',
                    }}
                  >
                    {group.quotes.map((quote, idx) => {
                      const status = statusConfig[quote.status] || statusConfig.pending;
                      return (
                        <div
                          key={quote.id}
                          onClick={() => setSelectedQuote(quote)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '14px 20px 14px 60px',
                            backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                            cursor: 'pointer',
                            borderBottom: idx < group.quotes.length - 1 ? '1px solid #F3F4F6' : 'none',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F5F0F9';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
                          }}
                        >
                          {/* Category/Service */}
                          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                            <p
                              style={{
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#36004E',
                                margin: '0 0 2px 0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {quote.service_request?.category || quote.service_request?.activity || quote.service_request?.service_title || 'Sin categoria'}
                            </p>
                            <p
                              style={{
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                fontSize: '12px',
                                color: '#9CA3AF',
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {quote.scope || quote.description || ''}
                            </p>
                          </div>

                          {/* Price */}
                          <div style={{ minWidth: '120px', textAlign: 'right' }}>
                            <span
                              style={{
                                fontFamily: "'Isidora Alt Bold', sans-serif",
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#22C55E',
                              }}
                            >
                              {formatPrice(quote)}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div style={{ minWidth: '120px', textAlign: 'center' }}>
                            <span
                              style={{
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                color: status.fg,
                                backgroundColor: status.bg,
                                padding: '4px 12px',
                                borderRadius: '8px',
                                display: 'inline-block',
                              }}
                            >
                              {status.label}
                            </span>
                          </div>

                          {/* Warranty */}
                          <div style={{ minWidth: '100px', textAlign: 'center' }}>
                            {quote.has_warranty ? (
                              <span
                                style={{
                                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                                  fontSize: '12px',
                                  color: '#15803D',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  justifyContent: 'center',
                                }}
                              >
                                <Shield style={{ width: '13px', height: '13px' }} />
                                {quote.warranty_days}d
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                                  fontSize: '12px',
                                  color: '#D1D5DB',
                                }}
                              >
                                Sin garantia
                              </span>
                            )}
                          </div>

                          {/* Date */}
                          <div style={{ minWidth: '120px', textAlign: 'right' }}>
                            {quote.proposed_date && (
                              <span
                                style={{
                                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                                  fontSize: '12px',
                                  color: '#36004E',
                                  display: 'block',
                                }}
                              >
                                Propuesta: {formatDate(quote.proposed_date)}
                              </span>
                            )}
                            <span
                              style={{
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                fontSize: '11px',
                                color: '#9CA3AF',
                              }}
                            >
                              Creada: {formatDate(quote.created_at)}
                            </span>
                          </div>
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
      <Modal isOpen={!!selectedQuote} onClose={() => setSelectedQuote(null)} title="Detalle de Cotizacion" size="lg">
        {selectedQuote && (
          <div>
            {/* Specialist Header */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #F3F4F6' }}>
              <Avatar
                src={selectedQuote.specialist_profile?.profile_photo_url || selectedQuote.specialist_user_profile?.avatar_url}
                name={selectedQuote.specialist_user_profile?.first_name}
                size="xl"
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '22px', color: '#36004E', margin: 0 }}>
                    {selectedQuote.specialist_user_profile?.first_name} {selectedQuote.specialist_user_profile?.last_name_paterno}
                  </h3>
                  <Badge variant={statusConfig[selectedQuote.status]?.variant || 'default'}>
                    {statusConfig[selectedQuote.status]?.label || selectedQuote.status}
                  </Badge>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#6B7280', margin: 0 }}>
                  {selectedQuote.specialist_profile?.specialist_type || 'Especialista'}
                </p>
                {selectedQuote.specialist_profile?.rating_promedio && (
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#FF9601', margin: '4px 0 0 0' }}>
                    ★ {Number(selectedQuote.specialist_profile.rating_promedio).toFixed(1)} ({selectedQuote.specialist_profile.total_reviews || 0} resenas)
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                  Precio Total
                </p>
                <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '28px', fontWeight: 'bold', color: '#22C55E', margin: 0 }}>
                  {formatPrice(selectedQuote)}
                </p>
              </div>
            </div>

            {/* Service Request Context */}
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', marginBottom: '24px' }}>
              <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '14px', color: '#6B7280', margin: '0 0 8px 0' }}>
                SOLICITUD DE SERVICIO
              </h4>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '16px', color: '#36004E', fontWeight: 500, margin: '0 0 4px 0' }}>
                {selectedQuote.service_request?.service_title || selectedQuote.service_request?.activity}
              </p>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>
                Cliente: {selectedQuote.client_profile?.first_name} {selectedQuote.client_profile?.last_name_paterno}
                {selectedQuote.client_profile?.phone && ` \u2022 Tel: ${selectedQuote.client_profile.phone}`}
              </p>
            </div>

            {/* Scope & Description */}
            {(selectedQuote.scope || selectedQuote.description) && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Alcance del Trabajo
                </h4>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                  {selectedQuote.scope || selectedQuote.description}
                </p>
              </div>
            )}

            {/* Exclusions */}
            {selectedQuote.exclusions && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Exclusiones
                </h4>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                  {selectedQuote.exclusions}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar style={{ width: '18px', height: '18px', color: '#FF9601' }} />
                  <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>Fecha Propuesta</span>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#36004E', fontWeight: 500, margin: 0 }}>
                  {formatDate(selectedQuote.proposed_date)}
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock style={{ width: '18px', height: '18px', color: '#009AFF' }} />
                  <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>Duracion Estimada</span>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#36004E', fontWeight: 500, margin: 0 }}>
                  {selectedQuote.estimated_duration_hours ? `${selectedQuote.estimated_duration_hours} horas` : '-'}
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Shield style={{ width: '18px', height: '18px', color: '#22C55E' }} />
                  <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>Garantia</span>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#36004E', fontWeight: 500, margin: 0 }}>
                  {selectedQuote.has_warranty ? `${selectedQuote.warranty_days} dias` : 'Sin garantia'}
                </p>
                {selectedQuote.warranty_description && (
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>
                    {selectedQuote.warranty_description}
                  </p>
                )}
              </div>

              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Package style={{ width: '18px', height: '18px', color: '#AA1BF1' }} />
                  <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>Materiales</span>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#36004E', fontWeight: 500, margin: 0 }}>
                  {selectedQuote.includes_materials ? 'Incluidos' : 'No incluidos'}
                </p>
              </div>
            </div>

            {/* Materials List */}
            {selectedQuote.materials_list && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Lista de Materiales
                </h4>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                  {selectedQuote.materials_list}
                </p>
              </div>
            )}

            {/* Additional Notes */}
            {selectedQuote.additional_notes && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Notas Adicionales
                </h4>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                  {selectedQuote.additional_notes}
                </p>
              </div>
            )}

            {/* Requires Visit */}
            {selectedQuote.requires_visit && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <AlertTriangle style={{ width: '20px', height: '20px', color: '#D97706' }} />
                <div>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#92400E', fontWeight: 500, margin: 0 }}>
                    Requiere visita previa
                  </p>
                  {selectedQuote.visit_cost && (
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#B45309', margin: '4px 0 0 0' }}>
                      Costo de visita: ${Number(selectedQuote.visit_cost).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid #F3F4F6' }}>
              <Button variant="ghost" onClick={() => setSelectedQuote(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
