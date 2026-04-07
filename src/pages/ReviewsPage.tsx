import { useEffect, useState } from 'react';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Badge, SearchInput, Tabs, Modal, Button, EmptyState, Avatar } from '../components/ui';
import type { Tables } from '../types/database';

type Review = Tables<'reviews'> & {
  client_profile?: Tables<'profiles'> | null;
  specialist_profile?: Tables<'specialist_profiles'> | null;
  specialist_user_profile?: Tables<'profiles'> | null;
  service_request?: Tables<'service_requests'> | null;
};

type ClientReview = Tables<'client_reviews'> & {
  specialist_profile?: Tables<'specialist_profiles'> | null;
  specialist_user_profile?: Tables<'profiles'> | null;
  client_profile?: Tables<'profiles'> | null;
  service_request?: Tables<'service_requests'> | null;
};

export function ReviewsPage() {
  const [specialistReviews, setSpecialistReviews] = useState<Review[]>([]);
  const [clientReviews, setClientReviews] = useState<ClientReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('specialists');
  const [selectedReview, setSelectedReview] = useState<Review | ClientReview | null>(null);
  const [reviewType, setReviewType] = useState<'specialist' | 'client'>('specialist');

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      setLoading(true);

      // Load specialist reviews (from clients about specialists)
      const { data: specReviews } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      const enrichedSpecReviews = await Promise.all(
        (specReviews || []).map(async (review) => {
          const [clientResult, specialistResult, requestResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', review.user_id).single(),
            supabase.from('specialist_profiles').select('*').eq('id', review.specialist_id).single(),
            supabase.from('service_requests').select('*').eq('id', review.request_id).single(),
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
            ...review,
            client_profile: clientResult.data,
            specialist_profile: specialistResult.data,
            specialist_user_profile: specialistUserProfile,
            service_request: requestResult.data,
          };
        })
      );

      setSpecialistReviews(enrichedSpecReviews);

      // Load client reviews (from specialists about clients)
      const { data: cliReviews } = await supabase
        .from('client_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      const enrichedClientReviews = await Promise.all(
        (cliReviews || []).map(async (review) => {
          const [clientResult, specialistResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', review.client_id).single(),
            supabase.from('specialist_profiles').select('*').eq('id', review.specialist_id).single(),
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
            ...review,
            client_profile: clientResult.data,
            specialist_profile: specialistResult.data,
            specialist_user_profile: specialistUserProfile,
          };
        })
      );

      setClientReviews(enrichedClientReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteReview(reviewId: string, type: 'specialist' | 'client') {
    try {
      const table = type === 'specialist' ? 'reviews' : 'client_reviews';
      const { error } = await supabase.from(table).delete().eq('id', reviewId);

      if (error) throw error;

      loadReviews();
      setSelectedReview(null);
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  }

  const filteredSpecialistReviews = specialistReviews.filter((review) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      review.comment?.toLowerCase().includes(searchLower) ||
      review.client_profile?.first_name?.toLowerCase().includes(searchLower) ||
      review.specialist_user_profile?.first_name?.toLowerCase().includes(searchLower)
    );
  });

  const filteredClientReviews = clientReviews.filter((review) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      review.client_profile?.first_name?.toLowerCase().includes(searchLower) ||
      review.specialist_user_profile?.first_name?.toLowerCase().includes(searchLower)
    );
  });

  const tabs = [
    { id: 'specialists', label: 'Resenas de Especialistas', count: specialistReviews.length },
    { id: 'clients', label: 'Resenas de Clientes', count: clientReviews.length },
  ];

  function renderStars(rating: number) {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            style={{
              width: '16px',
              height: '16px',
              fill: star <= rating ? '#FBBF24' : 'transparent',
              color: star <= rating ? '#FBBF24' : '#D1D5DB',
            }}
          />
        ))}
      </div>
    );
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar resenas..." />
      </div>

      {/* Specialist Reviews */}
      {activeTab === 'specialists' && (
        <>
          {filteredSpecialistReviews.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Star style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
                title="No hay resenas"
                description="No se encontraron resenas de especialistas."
              />
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredSpecialistReviews.map((review) => (
                <Card
                  key={review.id}
                  hover
                  onClick={() => {
                    setSelectedReview(review);
                    setReviewType('specialist');
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {/* Client Info */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                      <Avatar src={review.client_profile?.avatar_url} name={review.client_profile?.first_name} size="lg" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', fontWeight: 500, color: '#36004E' }}>
                            {review.client_profile?.first_name} {review.client_profile?.last_name_paterno}
                          </span>
                          <span style={{ color: '#9CA3AF' }}>→</span>
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#6B7280' }}>
                            {review.specialist_user_profile?.first_name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          {renderStars(review.rating)}
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#FBBF24' }}>
                            {review.rating.toFixed(1)}
                          </span>
                          {review.volveria_trabajar !== null && (
                            <Badge variant={review.volveria_trabajar ? 'success' : 'error'} size="sm">
                              {review.volveria_trabajar ? 'Volveria a contratar' : 'No volveria'}
                            </Badge>
                          )}
                        </div>
                        {review.comment && (
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
                            "{review.comment}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Service & Date */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Badge variant="info" size="sm">{review.service_request?.category}</Badge>
                      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '8px 0 0 0' }}>
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Client Reviews */}
      {activeTab === 'clients' && (
        <>
          {filteredClientReviews.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Star style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
                title="No hay resenas"
                description="No se encontraron resenas de clientes."
              />
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredClientReviews.map((review) => (
                <Card
                  key={review.id}
                  hover
                  onClick={() => {
                    setSelectedReview(review);
                    setReviewType('client');
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {/* Specialist Info */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                      <Avatar
                        src={review.specialist_user_profile?.avatar_url}
                        name={review.specialist_user_profile?.first_name}
                        size="lg"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', fontWeight: 500, color: '#36004E' }}>
                            {review.specialist_user_profile?.first_name} {review.specialist_user_profile?.last_name_paterno}
                          </span>
                          <span style={{ color: '#9CA3AF' }}>→</span>
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '15px', color: '#6B7280' }}>
                            {review.client_profile?.first_name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          {renderStars(review.average_score || 0)}
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', fontWeight: 600, color: '#FBBF24' }}>
                            {(review.average_score || 0).toFixed(1)}
                          </span>
                          {review.volveria_trabajar_con_cliente !== undefined && (
                            <Badge variant={review.volveria_trabajar_con_cliente ? 'success' : 'error'} size="sm">
                              {review.volveria_trabajar_con_cliente ? 'Volveria a trabajar' : 'No volveria'}
                            </Badge>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>
                            Claridad: {review.claridad_necesidades}/5
                          </span>
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>
                            Puntualidad: {review.puntualidad_disponibilidad}/5
                          </span>
                          <span style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '13px', color: '#6B7280' }}>
                            Pago: {review.claridad_cumplimiento_pago}/5
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Date */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title={reviewType === 'specialist' ? 'Resena de Especialista' : 'Resena de Cliente'}
        size="md"
      >
        {selectedReview && reviewType === 'specialist' && (
          <div>
            {/* Review Header */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #F3F4F6' }}>
              <Avatar
                src={(selectedReview as Review).client_profile?.avatar_url}
                name={(selectedReview as Review).client_profile?.first_name}
                size="xl"
              />
              <div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                  Resena de
                </p>
                <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '20px', color: '#36004E', margin: '0 0 4px 0' }}>
                  {(selectedReview as Review).client_profile?.first_name} {(selectedReview as Review).client_profile?.last_name_paterno}
                </p>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>
                  Para: {(selectedReview as Review).specialist_user_profile?.first_name}
                </p>
              </div>
            </div>

            {/* Rating */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {renderStars((selectedReview as Review).rating)}
                <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#FBBF24' }}>
                  {(selectedReview as Review).rating.toFixed(1)}
                </span>
              </div>

              {/* Detailed Ratings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {(selectedReview as Review).calidad_trabajo && (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                      Calidad del Trabajo
                    </p>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '16px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                      {(selectedReview as Review).calidad_trabajo}/5
                    </p>
                  </div>
                )}
                {(selectedReview as Review).puntualidad && (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                      Puntualidad
                    </p>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '16px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                      {(selectedReview as Review).puntualidad}/5
                    </p>
                  </div>
                )}
                {(selectedReview as Review).profesionalismo && (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                      Profesionalismo
                    </p>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '16px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                      {(selectedReview as Review).profesionalismo}/5
                    </p>
                  </div>
                )}
                {(selectedReview as Review).relacion_calidad_precio && (
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                      Relacion Calidad/Precio
                    </p>
                    <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '16px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                      {(selectedReview as Review).relacion_calidad_precio}/5
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Comment */}
            {(selectedReview as Review).comment && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '16px', color: '#36004E', margin: '0 0 12px 0' }}>
                  Comentario
                </h4>
                <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                    "{(selectedReview as Review).comment}"
                  </p>
                </div>
              </div>
            )}

            {/* Would Work Again */}
            {(selectedReview as Review).volveria_trabajar !== null && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: (selectedReview as Review).volveria_trabajar ? '#DCFCE7' : '#FEE2E2',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                {(selectedReview as Review).volveria_trabajar ? (
                  <ThumbsUp style={{ width: '20px', height: '20px', color: '#16A34A' }} />
                ) : (
                  <ThumbsDown style={{ width: '20px', height: '20px', color: '#DC2626' }} />
                )}
                <span
                  style={{
                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    color: (selectedReview as Review).volveria_trabajar ? '#166534' : '#991B1B',
                  }}
                >
                  {(selectedReview as Review).volveria_trabajar
                    ? 'El cliente volveria a contratar a este especialista'
                    : 'El cliente no volveria a contratar a este especialista'}
                </span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
              <Button
                variant="danger"
                leftIcon={<Trash2 style={{ width: '16px', height: '16px' }} />}
                onClick={() => {
                  if (confirm('¿Estas seguro de eliminar esta resena?')) {
                    deleteReview(selectedReview.id, 'specialist');
                  }
                }}
              >
                Eliminar Resena
              </Button>
              <Button variant="ghost" onClick={() => setSelectedReview(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}

        {selectedReview && reviewType === 'client' && (
          <div>
            {/* Review Header */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #F3F4F6' }}>
              <Avatar
                src={(selectedReview as ClientReview).specialist_user_profile?.avatar_url}
                name={(selectedReview as ClientReview).specialist_user_profile?.first_name}
                size="xl"
              />
              <div>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                  Resena de
                </p>
                <p style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '20px', color: '#36004E', margin: '0 0 4px 0' }}>
                  {(selectedReview as ClientReview).specialist_user_profile?.first_name}
                </p>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>
                  Para cliente: {(selectedReview as ClientReview).client_profile?.first_name}
                </p>
              </div>
            </div>

            {/* Rating */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {renderStars((selectedReview as ClientReview).average_score || 0)}
                <span style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '24px', color: '#FBBF24' }}>
                  {((selectedReview as ClientReview).average_score || 0).toFixed(1)}
                </span>
              </div>

              {/* Detailed Ratings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                    Claridad de Necesidades
                  </p>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '16px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                    {(selectedReview as ClientReview).claridad_necesidades}/5
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                    Puntualidad
                  </p>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '16px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                    {(selectedReview as ClientReview).puntualidad_disponibilidad}/5
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                    Cumplimiento de Pago
                  </p>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '16px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                    {(selectedReview as ClientReview).claridad_cumplimiento_pago}/5
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                    Condiciones de Trabajo
                  </p>
                  <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '16px', fontWeight: 500, color: '#36004E', margin: 0 }}>
                    {(selectedReview as ClientReview).facilito_condiciones_trabajo}/5
                  </p>
                </div>
              </div>
            </div>

            {/* Would Work Again */}
            <div
              style={{
                padding: '16px',
                backgroundColor: (selectedReview as ClientReview).volveria_trabajar_con_cliente ? '#DCFCE7' : '#FEE2E2',
                borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {(selectedReview as ClientReview).volveria_trabajar_con_cliente ? (
                <ThumbsUp style={{ width: '20px', height: '20px', color: '#16A34A' }} />
              ) : (
                <ThumbsDown style={{ width: '20px', height: '20px', color: '#DC2626' }} />
              )}
              <span
                style={{
                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                  color: (selectedReview as ClientReview).volveria_trabajar_con_cliente ? '#166534' : '#991B1B',
                }}
              >
                {(selectedReview as ClientReview).volveria_trabajar_con_cliente
                  ? 'El especialista volveria a trabajar con este cliente'
                  : 'El especialista no volveria a trabajar con este cliente'}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
              <Button
                variant="danger"
                leftIcon={<Trash2 style={{ width: '16px', height: '16px' }} />}
                onClick={() => {
                  if (confirm('¿Estas seguro de eliminar esta resena?')) {
                    deleteReview(selectedReview.id, 'client');
                  }
                }}
              >
                Eliminar Resena
              </Button>
              <Button variant="ghost" onClick={() => setSelectedReview(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
