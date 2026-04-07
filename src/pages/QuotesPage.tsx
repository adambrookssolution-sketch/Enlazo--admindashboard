import { useEffect, useState } from 'react';
import {
  MessageSquareQuote,
  Calendar,
  Clock,
  Shield,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bookmark,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Badge, SearchInput, Tabs, Modal, Button, EmptyState, Avatar } from '../components/ui';
import type { Tables } from '../types/database';

type Quote = Tables<'quotes'> & {
  specialist_profile?: Tables<'specialist_profiles'> | null;
  specialist_user_profile?: Tables<'profiles'> | null;
  service_request?: Tables<'service_requests'> | null;
  client_profile?: Tables<'profiles'> | null;
};

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' | 'purple' }> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  pre_selected: { label: 'Preseleccionada', variant: 'info' },
  accepted: { label: 'Aceptada', variant: 'success' },
  rejected: { label: 'Rechazada', variant: 'error' },
};

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
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
        query = query.eq('status', activeTab as 'pending' | 'accepted' | 'rejected' | 'pre_selected');
      }

      const { data, error } = await query;

      if (error) throw error;

      const enrichedQuotes = await Promise.all(
        (data || []).map(async (quote) => {
          const [specialistProfileResult, requestResult] = await Promise.all([
            supabase.from('specialist_profiles').select('*').eq('id', quote.specialist_id).single(),
            supabase.from('service_requests').select('*').eq('id', quote.request_id).single(),
          ]);

          let specialistUserProfile = null;
          let clientProfile = null;

          if (specialistProfileResult.data?.user_id) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', specialistProfileResult.data.user_id)
              .single();
            specialistUserProfile = userProfile;
          }

          if (requestResult.data?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', requestResult.data.user_id)
              .single();
            clientProfile = profile;
          }

          return {
            ...quote,
            specialist_profile: specialistProfileResult.data,
            specialist_user_profile: specialistUserProfile,
            service_request: requestResult.data,
            client_profile: clientProfile,
          };
        })
      );

      setQuotes(enrichedQuotes);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateQuoteStatus(quoteId: string, newStatus: 'pending' | 'accepted' | 'rejected' | 'pre_selected') {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quoteId);

      if (error) throw error;

      loadQuotes();
      loadCounts();
      setSelectedQuote(null);
    } catch (error) {
      console.error('Error updating quote:', error);
    }
  }

  const filteredQuotes = quotes.filter((quote) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      quote.scope?.toLowerCase().includes(searchLower) ||
      quote.description?.toLowerCase().includes(searchLower) ||
      quote.specialist_user_profile?.first_name?.toLowerCase().includes(searchLower) ||
      quote.service_request?.activity?.toLowerCase().includes(searchLower)
    );
  });

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
    if (quote.price_fixed) return `$${quote.price_fixed.toLocaleString()}`;
    if (quote.price_min && quote.price_max) return `$${quote.price_min.toLocaleString()} - $${quote.price_max.toLocaleString()}`;
    if (quote.price_min) return `Desde $${quote.price_min.toLocaleString()}`;
    if (quote.price_max) return `Hasta $${quote.price_max.toLocaleString()}`;
    return 'Sin precio';
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cotizaciones..." />
      </div>

      {/* Quotes Grid */}
      {filteredQuotes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageSquareQuote style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
            title="No hay cotizaciones"
            description="No se encontraron cotizaciones con los filtros actuales."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredQuotes.map((quote) => {
            const status = statusConfig[quote.status] || statusConfig.pending;
            return (
              <Card key={quote.id} hover onClick={() => setSelectedQuote(quote)}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {/* Left: Specialist Info */}
                  <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                      <Avatar
                        src={quote.specialist_profile?.profile_photo_url || quote.specialist_user_profile?.avatar_url}
                        name={quote.specialist_user_profile?.first_name}
                        size="lg"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <h3
                            style={{
                              fontFamily: "'Isidora Alt Bold', sans-serif",
                              fontSize: '18px',
                              fontWeight: 'bold',
                              color: '#36004E',
                              margin: 0,
                            }}
                          >
                            {quote.specialist_user_profile?.first_name} {quote.specialist_user_profile?.last_name_paterno}
                          </h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '14px',
                            color: '#6B7280',
                            margin: 0,
                          }}
                        >
                          {quote.specialist_profile?.specialist_type || 'Especialista'}
                        </p>
                      </div>
                    </div>

                    {/* Service Request Info */}
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                        Solicitud
                      </p>
                      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#36004E', fontWeight: 500, margin: 0 }}>
                        {quote.service_request?.service_title || quote.service_request?.activity}
                      </p>
                      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
                        Cliente: {quote.client_profile?.first_name} {quote.client_profile?.last_name_paterno}
                      </p>
                    </div>

                    {quote.scope && (
                      <p
                        style={{
                          fontFamily: "'Centrale Sans Rounded', sans-serif",
                          fontSize: '14px',
                          color: '#4B5563',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {quote.scope}
                      </p>
                    )}
                  </div>

                  {/* Right: Price & Details */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '12px',
                      minWidth: '180px',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                        Precio Cotizado
                      </p>
                      <p
                        style={{
                          fontFamily: "'Isidora Alt Bold', sans-serif",
                          fontSize: '22px',
                          fontWeight: 'bold',
                          color: '#22C55E',
                          margin: 0,
                        }}
                      >
                        {formatPrice(quote)}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {quote.has_warranty && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            backgroundColor: '#DCFCE7',
                            borderRadius: '8px',
                          }}
                        >
                          <Shield style={{ width: '14px', height: '14px', color: '#16A34A' }} />
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#16A34A' }}>
                            {quote.warranty_days}d garantia
                          </span>
                        </div>
                      )}
                      {quote.includes_materials && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            backgroundColor: '#DBEAFE',
                            borderRadius: '8px',
                          }}
                        >
                          <Package style={{ width: '14px', height: '14px', color: '#2563EB' }} />
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#2563EB' }}>
                            Incluye materiales
                          </span>
                        </div>
                      )}
                    </div>

                    {quote.proposed_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar style={{ width: '14px', height: '14px', color: '#9CA3AF' }} />
                        <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>
                          {formatDate(quote.proposed_date)}
                        </span>
                      </div>
                    )}

                    <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF' }}>
                      Enviada: {formatDate(quote.created_at)}
                    </span>
                  </div>
                </div>
              </Card>
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
                  <Badge variant={statusConfig[selectedQuote.status]?.variant}>
                    {statusConfig[selectedQuote.status]?.label}
                  </Badge>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#6B7280', margin: 0 }}>
                  {selectedQuote.specialist_profile?.specialist_type || 'Especialista'}
                </p>
                {selectedQuote.specialist_profile?.rating_promedio && (
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#FF9601', margin: '4px 0 0 0' }}>
                    ★ {selectedQuote.specialist_profile.rating_promedio.toFixed(1)} ({selectedQuote.specialist_profile.total_reviews || 0} resenas)
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
                {selectedQuote.client_profile?.phone && ` • Tel: ${selectedQuote.client_profile.phone}`}
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
                      Costo de visita: ${selectedQuote.visit_cost.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '24px', borderTop: '1px solid #F3F4F6' }}>
              {selectedQuote.status === 'pending' && (
                <>
                  <Button
                    variant="secondary"
                    leftIcon={<Bookmark style={{ width: '16px', height: '16px' }} />}
                    onClick={() => updateQuoteStatus(selectedQuote.id, 'pre_selected')}
                  >
                    Preseleccionar
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={<CheckCircle style={{ width: '16px', height: '16px' }} />}
                    onClick={() => updateQuoteStatus(selectedQuote.id, 'accepted')}
                  >
                    Aceptar
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={<XCircle style={{ width: '16px', height: '16px' }} />}
                    onClick={() => updateQuoteStatus(selectedQuote.id, 'rejected')}
                  >
                    Rechazar
                  </Button>
                </>
              )}
              {selectedQuote.status === 'pre_selected' && (
                <>
                  <Button
                    variant="primary"
                    leftIcon={<CheckCircle style={{ width: '16px', height: '16px' }} />}
                    onClick={() => updateQuoteStatus(selectedQuote.id, 'accepted')}
                  >
                    Aceptar
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<XCircle style={{ width: '16px', height: '16px' }} />}
                    onClick={() => updateQuoteStatus(selectedQuote.id, 'pending')}
                  >
                    Quitar Preseleccion
                  </Button>
                </>
              )}
              {(selectedQuote.status === 'accepted' || selectedQuote.status === 'rejected') && (
                <Button
                  variant="outline"
                  onClick={() => updateQuoteStatus(selectedQuote.id, 'pending')}
                >
                  Restablecer a Pendiente
                </Button>
              )}
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
