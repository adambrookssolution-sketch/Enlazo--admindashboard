import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Flag,
  XCircle,
  UserX,
  Ban,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Badge, SearchInput, Tabs, Modal, Button, EmptyState, Avatar } from '../components/ui';
import type { Tables } from '../types/database';

type ProblemReport = Tables<'specialist_problem_reports'> & {
  client_profile?: Tables<'profiles'> | null;
  specialist_profile?: Tables<'specialist_profiles'> | null;
  specialist_user_profile?: Tables<'profiles'> | null;
  service_request?: Tables<'service_requests'> | null;
  quote?: Tables<'quotes'> | null;
};

type CancellationFeedback = Tables<'request_cancellation_feedback'> & {
  user_profile?: Tables<'profiles'> | null;
  service_request?: Tables<'service_requests'> | null;
};

type Rejection = Tables<'specialist_request_rejections'> & {
  specialist_profile?: Tables<'specialist_profiles'> | null;
  specialist_user_profile?: Tables<'profiles'> | null;
  service_request?: Tables<'service_requests'> | null;
};

const reasonLabels: Record<string, string> = {
  no_show: 'No se presento',
  poor_quality: 'Mala calidad del trabajo',
  unprofessional: 'Comportamiento no profesional',
  price_dispute: 'Disputa de precio',
  incomplete_work: 'Trabajo incompleto',
  damage: 'Dano a la propiedad',
  harassment: 'Acoso o maltrato',
  fraud: 'Fraude',
  other: 'Otro',
  found_elsewhere: 'Encontro otro proveedor',
  changed_mind: 'Cambio de opinion',
  too_expensive: 'Precio muy alto',
  timing_issues: 'Problemas de horario',
  not_available: 'No disponible',
  out_of_area: 'Fuera de zona',
  not_my_specialty: 'No es mi especialidad',
  too_busy: 'Muy ocupado',
};

export function ReportsPage() {
  const [problemReports, setProblemReports] = useState<ProblemReport[]>([]);
  const [cancellations, setCancellations] = useState<CancellationFeedback[]>([]);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('problems');
  const [selectedReport, setSelectedReport] = useState<ProblemReport | null>(null);
  const [selectedCancellation, setSelectedCancellation] = useState<CancellationFeedback | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);

      // Load problem reports
      const { data: problems } = await supabase
        .from('specialist_problem_reports')
        .select('*')
        .order('created_at', { ascending: false });

      const enrichedProblems = await Promise.all(
        (problems || []).map(async (report) => {
          const [clientResult, specialistResult, requestResult, quoteResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', report.user_id).single(),
            supabase.from('specialist_profiles').select('*').eq('id', report.specialist_id).single(),
            supabase.from('service_requests').select('*').eq('id', report.request_id).single(),
            supabase.from('quotes').select('*').eq('id', report.quote_id).single(),
          ]);

          let specialistUserProfile = null;
          if (specialistResult.data?.user_id) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', specialistResult.data.user_id)
              .single();
            specialistUserProfile = data;
          }

          return {
            ...report,
            client_profile: clientResult.data,
            specialist_profile: specialistResult.data,
            specialist_user_profile: specialistUserProfile,
            service_request: requestResult.data,
            quote: quoteResult.data,
          };
        })
      );

      setProblemReports(enrichedProblems);

      // Load cancellation feedback
      const { data: cancellationData } = await supabase
        .from('request_cancellation_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      const enrichedCancellations = await Promise.all(
        (cancellationData || []).map(async (feedback) => {
          const [userResult, requestResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', feedback.user_id).single(),
            supabase.from('service_requests').select('*').eq('id', feedback.request_id).single(),
          ]);

          return {
            ...feedback,
            user_profile: userResult.data,
            service_request: requestResult.data,
          };
        })
      );

      setCancellations(enrichedCancellations);

      // Load rejections
      const { data: rejectionData } = await supabase
        .from('specialist_request_rejections')
        .select('*')
        .order('created_at', { ascending: false });

      const enrichedRejections = await Promise.all(
        (rejectionData || []).map(async (rejection) => {
          const [specialistResult, requestResult] = await Promise.all([
            supabase.from('specialist_profiles').select('*').eq('id', rejection.specialist_id).single(),
            supabase.from('service_requests').select('*').eq('id', rejection.request_id).single(),
          ]);

          let specialistUserProfile = null;
          if (specialistResult.data?.user_id) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', specialistResult.data.user_id)
              .single();
            specialistUserProfile = data;
          }

          return {
            ...rejection,
            specialist_profile: specialistResult.data,
            specialist_user_profile: specialistUserProfile,
            service_request: requestResult.data,
          };
        })
      );

      setRejections(enrichedRejections);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: 'problems', label: 'Reportes de Problemas', count: problemReports.length },
    { id: 'cancellations', label: 'Cancelaciones', count: cancellations.length },
    { id: 'rejections', label: 'Rechazos', count: rejections.length },
  ];

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const getSeverityBadge = (reason: string) => {
    const highSeverity = ['harassment', 'fraud', 'damage'];
    const mediumSeverity = ['no_show', 'unprofessional', 'price_dispute'];

    if (highSeverity.includes(reason)) {
      return <Badge variant="error">Alta Severidad</Badge>;
    }
    if (mediumSeverity.includes(reason)) {
      return <Badge variant="warning">Media Severidad</Badge>;
    }
    return <Badge variant="info">Baja Severidad</Badge>;
  };

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
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar reportes..." />
      </div>

      {/* Problem Reports */}
      {activeTab === 'problems' && (
        <>
          {problemReports.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Flag style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
                title="No hay reportes"
                description="No se han recibido reportes de problemas."
              />
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {problemReports.map((report) => (
                <Card key={report.id} hover onClick={() => setSelectedReport(report)}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <AlertTriangle style={{ width: '24px', height: '24px', color: '#DC2626' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: 0 }}>
                          {reasonLabels[report.main_reason] || report.main_reason}
                        </h3>
                        {getSeverityBadge(report.main_reason)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Avatar src={report.client_profile?.avatar_url} name={report.client_profile?.first_name} size="sm" />
                        <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>
                          {report.client_profile?.first_name} reporto a
                        </span>
                        <Avatar src={report.specialist_user_profile?.avatar_url} name={report.specialist_user_profile?.first_name} size="sm" />
                        <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#36004E', fontWeight: 500 }}>
                          {report.specialist_user_profile?.first_name}
                        </span>
                      </div>
                      {report.other_reason_text && (
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
                          "{report.other_reason_text}"
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Badge variant="info" size="sm">{report.service_request?.category}</Badge>
                      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '8px 0 0 0' }}>
                        {formatDate(report.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Cancellations */}
      {activeTab === 'cancellations' && (
        <>
          {cancellations.length === 0 ? (
            <Card>
              <EmptyState
                icon={<XCircle style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
                title="No hay cancelaciones"
                description="No se han registrado cancelaciones."
              />
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {cancellations.map((feedback) => (
                <Card key={feedback.id} hover onClick={() => setSelectedCancellation(feedback)}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: '#FEF3C7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <XCircle style={{ width: '24px', height: '24px', color: '#D97706' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: 0 }}>
                          {reasonLabels[feedback.main_reason] || feedback.main_reason}
                        </h3>
                        <Badge variant="warning">Cancelacion</Badge>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Avatar src={feedback.user_profile?.avatar_url} name={feedback.user_profile?.first_name} size="sm" />
                        <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>
                          {feedback.user_profile?.first_name} cancelo
                        </span>
                        <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#36004E', fontWeight: 500 }}>
                          "{feedback.service_request?.service_title || feedback.service_request?.activity}"
                        </span>
                      </div>
                      {feedback.improvement_text && (
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
                          Sugerencia: "{feedback.improvement_text}"
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                        {formatDate(feedback.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Rejections */}
      {activeTab === 'rejections' && (
        <>
          {rejections.length === 0 ? (
            <Card>
              <EmptyState
                icon={<UserX style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
                title="No hay rechazos"
                description="No se han registrado rechazos de solicitudes."
              />
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {rejections.map((rejection) => (
                <Card key={rejection.id}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Ban style={{ width: '24px', height: '24px', color: '#6B7280' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: 0 }}>
                          {reasonLabels[rejection.main_reason] || rejection.main_reason}
                        </h3>
                        <Badge variant="default">Rechazo</Badge>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Avatar src={rejection.specialist_user_profile?.avatar_url} name={rejection.specialist_user_profile?.first_name} size="sm" />
                        <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280' }}>
                          {rejection.specialist_user_profile?.first_name} rechazo
                        </span>
                        <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#36004E', fontWeight: 500 }}>
                          "{rejection.service_request?.service_title || rejection.service_request?.activity}"
                        </span>
                      </div>
                      {rejection.other_reason_text && (
                        <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#4B5563', margin: 0 }}>
                          "{rejection.other_reason_text}"
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Badge variant="info" size="sm">{rejection.service_request?.category}</Badge>
                      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '8px 0 0 0' }}>
                        {formatDate(rejection.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Problem Report Detail Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Detalle del Reporte"
        size="md"
      >
        {selectedReport && (
          <div>
            {/* Severity */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#FEE2E2',
                borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertTriangle style={{ width: '24px', height: '24px', color: '#DC2626' }} />
              <div>
                <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#991B1B', margin: 0 }}>
                  {reasonLabels[selectedReport.main_reason] || selectedReport.main_reason}
                </p>
                {getSeverityBadge(selectedReport.main_reason)}
              </div>
            </div>

            {/* Parties Involved */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 8px 0' }}>
                  Reportado por
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar src={selectedReport.client_profile?.avatar_url} name={selectedReport.client_profile?.first_name} size="lg" />
                  <div>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                      {selectedReport.client_profile?.first_name} {selectedReport.client_profile?.last_name_paterno}
                    </p>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280', margin: 0 }}>
                      Cliente
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 8px 0' }}>
                  Especialista Reportado
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar src={selectedReport.specialist_user_profile?.avatar_url} name={selectedReport.specialist_user_profile?.first_name} size="lg" />
                  <div>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                      {selectedReport.specialist_user_profile?.first_name} {selectedReport.specialist_user_profile?.last_name_paterno}
                    </p>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280', margin: 0 }}>
                      {selectedReport.specialist_profile?.specialist_type || 'Especialista'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Context */}
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', marginBottom: '24px' }}>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                Servicio Relacionado
              </p>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                {selectedReport.service_request?.service_title || selectedReport.service_request?.activity}
              </p>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
                Categoria: {selectedReport.service_request?.category}
              </p>
            </div>

            {/* Details */}
            {selectedReport.other_reason_text && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Descripcion del Problema
                </h4>
                <div style={{ padding: '16px', backgroundColor: '#FEF3C7', borderRadius: '12px' }}>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#92400E', margin: 0, lineHeight: 1.6 }}>
                    "{selectedReport.other_reason_text}"
                  </p>
                </div>
              </div>
            )}

            {/* Date */}
            <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#9CA3AF', marginBottom: '24px' }}>
              Reportado el: {formatDate(selectedReport.created_at)}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
              <Button
                variant="danger"
                leftIcon={<Ban style={{ width: '16px', height: '16px' }} />}
                onClick={() => {
                  alert('Funcion de bloquear usuario disponible proximamente');
                }}
              >
                Bloquear Especialista
              </Button>
              <Button variant="ghost" onClick={() => setSelectedReport(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancellation Detail Modal */}
      <Modal
        isOpen={!!selectedCancellation}
        onClose={() => setSelectedCancellation(null)}
        title="Detalle de Cancelacion"
        size="md"
      >
        {selectedCancellation && (
          <div>
            {/* Reason */}
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
              <XCircle style={{ width: '24px', height: '24px', color: '#D97706' }} />
              <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#92400E', margin: 0 }}>
                {reasonLabels[selectedCancellation.main_reason] || selectedCancellation.main_reason}
              </p>
            </div>

            {/* User */}
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', marginBottom: '24px' }}>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 8px 0' }}>
                Cancelado por
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar src={selectedCancellation.user_profile?.avatar_url} name={selectedCancellation.user_profile?.first_name} size="lg" />
                <div>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                    {selectedCancellation.user_profile?.first_name} {selectedCancellation.user_profile?.last_name_paterno}
                  </p>
                </div>
              </div>
            </div>

            {/* Service */}
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', marginBottom: '24px' }}>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                Servicio Cancelado
              </p>
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                {selectedCancellation.service_request?.service_title || selectedCancellation.service_request?.activity}
              </p>
            </div>

            {/* Other Reason */}
            {selectedCancellation.other_reason_text && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Razon Adicional
                </h4>
                <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                    "{selectedCancellation.other_reason_text}"
                  </p>
                </div>
              </div>
            )}

            {/* Improvement Suggestion */}
            {selectedCancellation.improvement_text && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Sugerencia de Mejora
                </h4>
                <div style={{ padding: '16px', backgroundColor: '#DCFCE7', borderRadius: '12px' }}>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#166534', margin: 0, lineHeight: 1.6 }}>
                    "{selectedCancellation.improvement_text}"
                  </p>
                </div>
              </div>
            )}

            {/* Date */}
            <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#9CA3AF', marginBottom: '24px' }}>
              Cancelado el: {formatDate(selectedCancellation.created_at)}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
              <Button variant="ghost" onClick={() => setSelectedCancellation(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
