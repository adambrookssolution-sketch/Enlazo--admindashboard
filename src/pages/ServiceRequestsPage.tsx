import { useEffect, useState } from 'react';
import {
  FileText,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  MessageSquare,
  CheckCircle,
  XCircle,
  Play,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Badge, SearchInput, Tabs, Modal, Button, EmptyState, Avatar } from '../components/ui';
import type { Tables } from '../types/database';

type ServiceRequest = Tables<'service_requests'> & {
  profile?: Tables<'profiles'> | null;
  location?: Tables<'locations'> | null;
  quotes_count?: number;
};

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' | 'purple' }> = {
  draft: { label: 'Borrador', variant: 'default' },
  active: { label: 'Activa', variant: 'info' },
  in_progress: { label: 'En Progreso', variant: 'purple' },
  completed: { label: 'Completada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'error' },
};

export function ServiceRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
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

  async function loadCounts() {
    const [all, active, inProgress, completed, cancelled] = await Promise.all([
      supabase.from('service_requests').select('*', { count: 'exact', head: true }),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ]);

    setCounts({
      all: all.count || 0,
      active: active.count || 0,
      in_progress: inProgress.count || 0,
      completed: completed.count || 0,
      cancelled: cancelled.count || 0,
    });
  }

  async function loadRequests() {
    try {
      setLoading(true);
      let query = supabase
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab as 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Load profiles and locations for each request
      const enrichedRequests = await Promise.all(
        (data || []).map(async (request) => {
          const [profileResult, locationResult, quotesResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', request.user_id).single(),
            request.location_id
              ? supabase.from('locations').select('*').eq('id', request.location_id).single()
              : Promise.resolve({ data: null }),
            supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('request_id', request.id),
          ]);

          return {
            ...request,
            profile: profileResult.data,
            location: locationResult.data,
            quotes_count: quotesResult.count || 0,
          };
        })
      );

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateRequestStatus(requestId: string, newStatus: 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled') {
    try {
      const { error } = await supabase
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

  const filteredRequests = requests.filter((request) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      request.activity?.toLowerCase().includes(searchLower) ||
      request.category?.toLowerCase().includes(searchLower) ||
      request.service_title?.toLowerCase().includes(searchLower) ||
      request.profile?.first_name?.toLowerCase().includes(searchLower)
    );
  });

  const tabs = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'active', label: 'Activas', count: counts.active },
    { id: 'in_progress', label: 'En Progreso', count: counts.in_progress },
    { id: 'completed', label: 'Completadas', count: counts.completed },
    { id: 'cancelled', label: 'Canceladas', count: counts.cancelled },
  ];

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
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar solicitudes..." />
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
            title="No hay solicitudes"
            description="No se encontraron solicitudes con los filtros actuales."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredRequests.map((request) => {
            const status = statusConfig[request.status] || statusConfig.draft;
            return (
              <Card key={request.id} hover onClick={() => setSelectedRequest(request)}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {/* Left: Main Info */}
                  <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                      <Avatar src={request.profile?.avatar_url} name={request.profile?.first_name} size="lg" />
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
                            {request.service_title || request.activity}
                          </h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {request.is_urgent && <Badge variant="error">Urgente</Badge>}
                        </div>
                        <p
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '14px',
                            color: '#6B7280',
                            margin: 0,
                          }}
                        >
                          {request.profile?.first_name} {request.profile?.last_name_paterno}
                        </p>
                      </div>
                    </div>

                    {request.service_description && (
                      <p
                        style={{
                          fontFamily: "'Centrale Sans Rounded', sans-serif",
                          fontSize: '14px',
                          color: '#4B5563',
                          margin: '0 0 16px 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {request.service_description}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText style={{ width: '16px', height: '16px', color: '#9CA3AF' }} />
                        <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>
                          {request.category}
                        </span>
                      </div>
                      {request.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin style={{ width: '16px', height: '16px', color: '#9CA3AF' }} />
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>
                            {request.location.city}, {request.location.state}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar style={{ width: '16px', height: '16px', color: '#9CA3AF' }} />
                        <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>
                          {formatDate(request.scheduled_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stats */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '12px',
                      minWidth: '160px',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <p
                        style={{
                          fontFamily: "'Centrale Sans Rounded', sans-serif",
                          fontSize: '12px',
                          color: '#9CA3AF',
                          margin: '0 0 4px 0',
                        }}
                      >
                        Presupuesto
                      </p>
                      <p
                        style={{
                          fontFamily: "'Isidora Alt Bold', sans-serif",
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#36004E',
                          margin: 0,
                        }}
                      >
                        {formatPrice(request.price_min, request.price_max)}
                      </p>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '10px',
                      }}
                    >
                      <MessageSquare style={{ width: '16px', height: '16px', color: '#AA1BF1' }} />
                      <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#36004E', fontWeight: 500 }}>
                        {request.quotes_count} cotizaciones
                      </span>
                    </div>
                    <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF' }}>
                      Creada: {formatDate(request.created_at)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Detalle de Solicitud" size="lg">
        {selectedRequest && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #F3F4F6' }}>
              <Avatar src={selectedRequest.profile?.avatar_url} name={selectedRequest.profile?.first_name} size="xl" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '22px', color: '#36004E', margin: 0 }}>
                    {selectedRequest.service_title || selectedRequest.activity}
                  </h3>
                  <Badge variant={statusConfig[selectedRequest.status]?.variant}>
                    {statusConfig[selectedRequest.status]?.label}
                  </Badge>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#6B7280', margin: 0 }}>
                  Cliente: {selectedRequest.profile?.first_name} {selectedRequest.profile?.last_name_paterno}
                </p>
                {selectedRequest.profile?.phone && (
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#9CA3AF', margin: '4px 0 0 0' }}>
                    Tel: {selectedRequest.profile.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                Descripcion
              </h4>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                {selectedRequest.service_description || selectedRequest.description || 'Sin descripcion'}
              </p>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileText style={{ width: '18px', height: '18px', color: '#AA1BF1' }} />
                  <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>Categoria</span>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#36004E', fontWeight: 500, margin: 0 }}>
                  {selectedRequest.category}
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <DollarSign style={{ width: '18px', height: '18px', color: '#22C55E' }} />
                  <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>Presupuesto</span>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#36004E', fontWeight: 500, margin: 0 }}>
                  {formatPrice(selectedRequest.price_min, selectedRequest.price_max)}
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar style={{ width: '18px', height: '18px', color: '#FF9601' }} />
                  <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>Fecha Programada</span>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#36004E', fontWeight: 500, margin: 0 }}>
                  {formatDate(selectedRequest.scheduled_date)}
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock style={{ width: '18px', height: '18px', color: '#009AFF' }} />
                  <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>Horario</span>
                </div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#36004E', fontWeight: 500, margin: 0 }}>
                  {selectedRequest.time_start || selectedRequest.time_preference || 'Flexible'}
                </p>
              </div>
            </div>

            {/* Location */}
            {selectedRequest.location && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Ubicacion
                </h4>
                <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <MapPin style={{ width: '20px', height: '20px', color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#36004E', margin: '0 0 4px 0' }}>
                      {selectedRequest.location.street} {selectedRequest.location.ext_number}
                      {selectedRequest.location.int_number && `, Int. ${selectedRequest.location.int_number}`}
                    </p>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>
                      {selectedRequest.location.neighborhood}, {selectedRequest.location.city}, {selectedRequest.location.state}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence Images */}
            {selectedRequest.evidence_urls && selectedRequest.evidence_urls.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Evidencias ({selectedRequest.evidence_urls.length})
                </h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {selectedRequest.evidence_urls.map((url, index) => (
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
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div style="color: #9CA3AF"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
                        }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '24px', borderTop: '1px solid #F3F4F6' }}>
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
