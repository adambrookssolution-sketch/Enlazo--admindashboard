import { useEffect, useState } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SearchInput, EmptyState } from '../components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SpecialistRow {
  specialistId: string;
  name: string;
  completedJobs: number;
  avgRating: number;
  avgCalidad: number;
  avgCumplimiento: number;
  avgProfesionalismo: number;
  avgPuntualidad: number;
  avgRelacionCalidad: number;
  volveriaPercent: number;
  reviews: any[];
}

interface ClientRow {
  clientId: string;
  name: string;
  completedJobs: number;
  avgRating: number;
  avgClaridad: number;
  avgCumplimientoPago: number;
  avgPuntualidad: number;
  avgRespeto: number;
  avgFacilito: number;
  volveriaPercent: number;
  reviews: any[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ReviewsPage() {
  const [specialistRows, setSpecialistRows] = useState<SpecialistRow[]>([]);
  const [clientRows, setClientRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'specialists' | 'clients'>('specialists');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  /* ---- data loading ---- */

  async function loadData() {
    try {
      setLoading(true);
      await Promise.all([loadSpecialistData(), loadClientData()]);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSpecialistData() {
    // 1. All specialist reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!reviews || reviews.length === 0) {
      setSpecialistRows([]);
      return;
    }

    // 2. Group by specialist_id
    const grouped: Record<string, any[]> = {};
    for (const r of reviews) {
      const sid = r.specialist_id;
      if (!sid) continue;
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(r);
    }

    // 3. Build rows
    const rows: SpecialistRow[] = [];

    for (const [specialistId, revs] of Object.entries(grouped)) {
      // Get specialist profile -> user_id -> profile name
      const { data: sp } = await supabase
        .from('specialist_profiles')
        .select('*')
        .eq('id', specialistId)
        .single();

      let name = 'Especialista desconocido';
      if (sp?.user_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sp.user_id)
          .single();
        if (prof) {
          name = [prof.first_name, prof.last_name_paterno, prof.last_name_materno]
            .filter(Boolean)
            .join(' ');
        }
      }

      // Completed jobs for this specialist
      const { count: completedJobs } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('specialist_id', specialistId)
        .eq('status', 'completed');

      // Enrich each review with reviewer name
      const enrichedRevs: any[] = [];
      for (const rev of revs) {
        let reviewerName = 'Cliente desconocido';
        if (rev.user_id) {
          const { data: rp } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', rev.user_id)
            .single();
          if (rp) {
            reviewerName = [rp.first_name, rp.last_name_paterno].filter(Boolean).join(' ');
          }
        }
        enrichedRevs.push({ ...rev, reviewerName });
      }

      const avg = (field: string) => {
        const vals = revs.map((r: any) => r[field]).filter((v: any) => v != null && typeof v === 'number');
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      };

      const volveriaCount = revs.filter((r: any) => r.volveria_trabajar === true).length;
      const volveriaTotal = revs.filter((r: any) => r.volveria_trabajar === true || r.volveria_trabajar === false).length;

      rows.push({
        specialistId,
        name,
        completedJobs: completedJobs || 0,
        avgRating: avg('average_score') || avg('rating'),
        avgCalidad: avg('calidad_trabajo'),
        avgCumplimiento: avg('cumplimiento_servicio'),
        avgProfesionalismo: avg('profesionalismo'),
        avgPuntualidad: avg('puntualidad'),
        avgRelacionCalidad: avg('relacion_calidad_precio'),
        volveriaPercent: volveriaTotal > 0 ? (volveriaCount / volveriaTotal) * 100 : 0,
        reviews: enrichedRevs,
      });
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));
    setSpecialistRows(rows);
  }

  async function loadClientData() {
    // 1. All client reviews
    const { data: reviews } = await supabase
      .from('client_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!reviews || reviews.length === 0) {
      setClientRows([]);
      return;
    }

    // 2. Group by client_id
    const grouped: Record<string, any[]> = {};
    for (const r of reviews) {
      const cid = r.client_id;
      if (!cid) continue;
      if (!grouped[cid]) grouped[cid] = [];
      grouped[cid].push(r);
    }

    // 3. Build rows
    const rows: ClientRow[] = [];

    for (const [clientId, revs] of Object.entries(grouped)) {
      // Get client profile name
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      let name = 'Cliente desconocido';
      if (prof) {
        name = [prof.first_name, prof.last_name_paterno, prof.last_name_materno]
          .filter(Boolean)
          .join(' ');
      }

      // Completed jobs for this client
      const { count: completedJobs } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', clientId)
        .eq('status', 'completed');

      // Enrich each review with reviewer (specialist) name
      const enrichedRevs: any[] = [];
      for (const rev of revs) {
        let reviewerName = 'Especialista desconocido';
        if (rev.specialist_id) {
          const { data: sp } = await supabase
            .from('specialist_profiles')
            .select('*')
            .eq('id', rev.specialist_id)
            .single();
          if (sp?.user_id) {
            const { data: rp } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sp.user_id)
              .single();
            if (rp) {
              reviewerName = [rp.first_name, rp.last_name_paterno].filter(Boolean).join(' ');
            }
          }
        }
        enrichedRevs.push({ ...rev, reviewerName });
      }

      const avg = (field: string) => {
        const vals = revs.map((r: any) => r[field]).filter((v: any) => v != null && typeof v === 'number');
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      };

      const volveriaCount = revs.filter((r: any) => r.volveria_trabajar_con_cliente === true).length;
      const volveriaTotal = revs.filter((r: any) => r.volveria_trabajar_con_cliente === true || r.volveria_trabajar_con_cliente === false).length;

      rows.push({
        clientId,
        name,
        completedJobs: completedJobs || 0,
        avgRating: avg('average_score'),
        avgClaridad: avg('claridad_necesidades'),
        avgCumplimientoPago: avg('claridad_cumplimiento_pago'),
        avgPuntualidad: avg('puntualidad_disponibilidad'),
        avgRespeto: avg('respeto_profesionalismo_cliente'),
        avgFacilito: avg('facilito_condiciones_trabajo'),
        volveriaPercent: volveriaTotal > 0 ? (volveriaCount / volveriaTotal) * 100 : 0,
        reviews: enrichedRevs,
      });
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));
    setClientRows(rows);
  }

  /* ---- helpers ---- */

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function renderStars(rating: number) {
    return (
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            style={{
              width: '14px',
              height: '14px',
              fill: star <= Math.round(rating) ? '#FBBF24' : 'transparent',
              color: star <= Math.round(rating) ? '#FBBF24' : '#D1D5DB',
            }}
          />
        ))}
      </div>
    );
  }

  function fmtNum(n: number) {
    return n.toFixed(1);
  }

  /* ---- filtering ---- */

  const filteredSpecialists = specialistRows.filter((row) => {
    if (!search) return true;
    return row.name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredClients = clientRows.filter((row) => {
    if (!search) return true;
    return row.name.toLowerCase().includes(search.toLowerCase());
  });

  /* ---- styles ---- */

  const fontBody: React.CSSProperties = { fontFamily: "'Centrale Sans Rounded', sans-serif" };
  const fontHeader: React.CSSProperties = { fontFamily: "'Isidora Alt Bold', sans-serif" };

  const thStyle: React.CSSProperties = {
    ...fontHeader,
    fontSize: '13px',
    color: '#FFFFFF',
    backgroundColor: '#36004E',
    padding: '12px 14px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    ...fontBody,
    fontSize: '14px',
    color: '#36004E',
    padding: '12px 14px',
    borderBottom: '1px solid #F3F4F6',
    whiteSpace: 'nowrap',
  };

  const rowHoverBg = '#F9F5FD';

  /* ---- toggle expand ---- */

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  /* ---- render ---- */

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
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0' }}>
          <button
            onClick={() => { setActiveTab('specialists'); setExpandedId(null); }}
            style={{
              ...fontHeader,
              fontSize: '15px',
              padding: '10px 24px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px 0 0 8px',
              backgroundColor: activeTab === 'specialists' ? '#36004E' : '#F3F4F6',
              color: activeTab === 'specialists' ? '#FFFFFF' : '#6B7280',
              transition: 'all 0.2s',
            }}
          >
            Especialistas ({specialistRows.length})
          </button>
          <button
            onClick={() => { setActiveTab('clients'); setExpandedId(null); }}
            style={{
              ...fontHeader,
              fontSize: '15px',
              padding: '10px 24px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '0 8px 8px 0',
              backgroundColor: activeTab === 'clients' ? '#36004E' : '#F3F4F6',
              color: activeTab === 'clients' ? '#FFFFFF' : '#6B7280',
              transition: 'all 0.2s',
            }}
          >
            Clientes ({clientRows.length})
          </button>
        </div>

        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre..." />
      </div>

      {/* ============ SPECIALIST TAB ============ */}
      {activeTab === 'specialists' && (
        <>
          {filteredSpecialists.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
              <EmptyState
                icon={<Star style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
                title="No hay resenas de especialistas"
                description="No se encontraron resenas."
              />
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF' }}>
                <thead>
                  <tr>
                    <th style={thStyle}></th>
                    <th style={thStyle}>Usuario</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Trabajos completados</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Resena Global</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Calidad Trabajo</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Cumplimiento Servicio</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Profesionalismo</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Puntualidad</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Relacion Calidad/Precio</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Volveria %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpecialists.map((row) => {
                    const isExpanded = expandedId === row.specialistId;
                    return (
                      <SpecialistRowBlock
                        key={row.specialistId}
                        row={row}
                        isExpanded={isExpanded}
                        onToggle={() => toggleExpand(row.specialistId)}
                        tdStyle={tdStyle}
                        fontBody={fontBody}
                        fontHeader={fontHeader}
                        rowHoverBg={rowHoverBg}
                        renderStars={renderStars}
                        formatDate={formatDate}
                        fmtNum={fmtNum}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ============ CLIENT TAB ============ */}
      {activeTab === 'clients' && (
        <>
          {filteredClients.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
              <EmptyState
                icon={<Star style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
                title="No hay resenas de clientes"
                description="No se encontraron resenas."
              />
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF' }}>
                <thead>
                  <tr>
                    <th style={thStyle}></th>
                    <th style={thStyle}>Usuario</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Trabajos completados</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Resena Global</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Claridad Necesidades</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Cumplimiento Pago</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Puntualidad</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Respeto/Profesionalismo</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Facilito Condiciones</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Volveria %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((row) => {
                    const isExpanded = expandedId === row.clientId;
                    return (
                      <ClientRowBlock
                        key={row.clientId}
                        row={row}
                        isExpanded={isExpanded}
                        onToggle={() => toggleExpand(row.clientId)}
                        tdStyle={tdStyle}
                        fontBody={fontBody}
                        fontHeader={fontHeader}
                        rowHoverBg={rowHoverBg}
                        renderStars={renderStars}
                        formatDate={formatDate}
                        fmtNum={fmtNum}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Specialist expandable row                                          */
/* ================================================================== */

function SpecialistRowBlock({
  row,
  isExpanded,
  onToggle,
  tdStyle,
  fontBody,
  fontHeader,
  rowHoverBg,
  renderStars,
  formatDate,
  fmtNum,
}: {
  row: SpecialistRow;
  isExpanded: boolean;
  onToggle: () => void;
  tdStyle: React.CSSProperties;
  fontBody: React.CSSProperties;
  fontHeader: React.CSSProperties;
  rowHoverBg: string;
  renderStars: (r: number) => React.ReactNode;
  formatDate: (d: string) => string;
  fmtNum: (n: number) => string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      {/* Summary row */}
      <tr
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: 'pointer',
          backgroundColor: isExpanded ? '#F3EAFC' : hovered ? rowHoverBg : '#FFFFFF',
          transition: 'background-color 0.15s',
        }}
      >
        <td style={{ ...tdStyle, width: '36px', textAlign: 'center' }}>
          {isExpanded ? (
            <ChevronUp style={{ width: '16px', height: '16px', color: '#AA1BF1' }} />
          ) : (
            <ChevronDown style={{ width: '16px', height: '16px', color: '#9CA3AF' }} />
          )}
        </td>
        <td style={{ ...tdStyle, fontWeight: 600 }}>{row.name}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{row.completedJobs}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {renderStars(row.avgRating)}
            <span style={{ fontWeight: 600, color: '#FBBF24' }}>{fmtNum(row.avgRating)}</span>
          </div>
        </td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgCalidad)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgCumplimiento)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgProfesionalismo)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgPuntualidad)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgRelacionCalidad)}</td>
        <td
          style={{
            ...tdStyle,
            textAlign: 'center',
            fontWeight: 600,
            color: row.volveriaPercent >= 50 ? '#16A34A' : '#DC2626',
          }}
        >
          {fmtNum(row.volveriaPercent)}%
        </td>
      </tr>

      {/* Expanded individual reviews */}
      {isExpanded && (
        <tr>
          <td colSpan={10} style={{ padding: 0 }}>
            <div style={{ backgroundColor: '#FAFAFE', padding: '16px 24px 16px 56px' }}>
              <h4
                style={{
                  ...fontHeader,
                  fontSize: '14px',
                  color: '#36004E',
                  margin: '0 0 12px 0',
                }}
              >
                Resenas individuales ({row.reviews.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {row.reviews.map((rev: any) => (
                  <div
                    key={rev.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ ...fontBody, fontSize: '14px', fontWeight: 600, color: '#36004E' }}>
                          {rev.reviewerName}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {renderStars(rev.rating || rev.average_score || 0)}
                          <span style={{ ...fontBody, fontSize: '13px', fontWeight: 600, color: '#FBBF24' }}>
                            {(rev.rating || rev.average_score || 0).toFixed(1)}
                          </span>
                        </div>
                        {(rev.volveria_trabajar === true || rev.volveria_trabajar === false) && (
                          <span
                            style={{
                              ...fontBody,
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: rev.volveria_trabajar === true ? '#DCFCE7' : '#FEE2E2',
                              color: rev.volveria_trabajar === true ? '#166534' : '#991B1B',
                              fontWeight: 500,
                            }}
                          >
                            {rev.volveria_trabajar === true ? 'Volveria' : 'No volveria'}
                          </span>
                        )}
                      </div>
                      <span style={{ ...fontBody, fontSize: '12px', color: '#9CA3AF' }}>
                        {rev.created_at ? formatDate(rev.created_at) : ''}
                      </span>
                    </div>
                    {/* Category breakdown */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: rev.comment ? '8px' : '0' }}>
                      {rev.calidad_trabajo != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Calidad: {rev.calidad_trabajo}/5</span>
                      )}
                      {rev.cumplimiento_servicio != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Cumplimiento: {rev.cumplimiento_servicio}/5</span>
                      )}
                      {rev.profesionalismo != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Profesionalismo: {rev.profesionalismo}/5</span>
                      )}
                      {rev.puntualidad != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Puntualidad: {rev.puntualidad}/5</span>
                      )}
                      {rev.relacion_calidad_precio != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Calidad/Precio: {rev.relacion_calidad_precio}/5</span>
                      )}
                    </div>
                    {rev.comment && (
                      <p style={{ ...fontBody, fontSize: '13px', color: '#4B5563', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ================================================================== */
/*  Client expandable row                                              */
/* ================================================================== */

function ClientRowBlock({
  row,
  isExpanded,
  onToggle,
  tdStyle,
  fontBody,
  fontHeader,
  rowHoverBg,
  renderStars,
  formatDate,
  fmtNum,
}: {
  row: ClientRow;
  isExpanded: boolean;
  onToggle: () => void;
  tdStyle: React.CSSProperties;
  fontBody: React.CSSProperties;
  fontHeader: React.CSSProperties;
  rowHoverBg: string;
  renderStars: (r: number) => React.ReactNode;
  formatDate: (d: string) => string;
  fmtNum: (n: number) => string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      {/* Summary row */}
      <tr
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: 'pointer',
          backgroundColor: isExpanded ? '#F3EAFC' : hovered ? rowHoverBg : '#FFFFFF',
          transition: 'background-color 0.15s',
        }}
      >
        <td style={{ ...tdStyle, width: '36px', textAlign: 'center' }}>
          {isExpanded ? (
            <ChevronUp style={{ width: '16px', height: '16px', color: '#AA1BF1' }} />
          ) : (
            <ChevronDown style={{ width: '16px', height: '16px', color: '#9CA3AF' }} />
          )}
        </td>
        <td style={{ ...tdStyle, fontWeight: 600 }}>{row.name}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{row.completedJobs}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {renderStars(row.avgRating)}
            <span style={{ fontWeight: 600, color: '#FBBF24' }}>{fmtNum(row.avgRating)}</span>
          </div>
        </td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgClaridad)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgCumplimientoPago)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgPuntualidad)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgRespeto)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(row.avgFacilito)}</td>
        <td
          style={{
            ...tdStyle,
            textAlign: 'center',
            fontWeight: 600,
            color: row.volveriaPercent >= 50 ? '#16A34A' : '#DC2626',
          }}
        >
          {fmtNum(row.volveriaPercent)}%
        </td>
      </tr>

      {/* Expanded individual reviews */}
      {isExpanded && (
        <tr>
          <td colSpan={10} style={{ padding: 0 }}>
            <div style={{ backgroundColor: '#FAFAFE', padding: '16px 24px 16px 56px' }}>
              <h4
                style={{
                  ...fontHeader,
                  fontSize: '14px',
                  color: '#36004E',
                  margin: '0 0 12px 0',
                }}
              >
                Resenas individuales ({row.reviews.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {row.reviews.map((rev: any) => (
                  <div
                    key={rev.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ ...fontBody, fontSize: '14px', fontWeight: 600, color: '#36004E' }}>
                          {rev.reviewerName}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {renderStars(rev.average_score || 0)}
                          <span style={{ ...fontBody, fontSize: '13px', fontWeight: 600, color: '#FBBF24' }}>
                            {(rev.average_score || 0).toFixed(1)}
                          </span>
                        </div>
                        {(rev.volveria_trabajar_con_cliente === true || rev.volveria_trabajar_con_cliente === false) && (
                          <span
                            style={{
                              ...fontBody,
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: rev.volveria_trabajar_con_cliente === true ? '#DCFCE7' : '#FEE2E2',
                              color: rev.volveria_trabajar_con_cliente === true ? '#166534' : '#991B1B',
                              fontWeight: 500,
                            }}
                          >
                            {rev.volveria_trabajar_con_cliente === true ? 'Volveria' : 'No volveria'}
                          </span>
                        )}
                      </div>
                      <span style={{ ...fontBody, fontSize: '12px', color: '#9CA3AF' }}>
                        {rev.created_at ? formatDate(rev.created_at) : ''}
                      </span>
                    </div>
                    {/* Category breakdown */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {rev.claridad_necesidades != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Claridad: {rev.claridad_necesidades}/5</span>
                      )}
                      {rev.claridad_cumplimiento_pago != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Pago: {rev.claridad_cumplimiento_pago}/5</span>
                      )}
                      {rev.puntualidad_disponibilidad != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Puntualidad: {rev.puntualidad_disponibilidad}/5</span>
                      )}
                      {rev.respeto_profesionalismo_cliente != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Respeto: {rev.respeto_profesionalismo_cliente}/5</span>
                      )}
                      {rev.facilito_condiciones_trabajo != null && (
                        <span style={{ ...fontBody, fontSize: '12px', color: '#6B7280' }}>Condiciones: {rev.facilito_condiciones_trabajo}/5</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
