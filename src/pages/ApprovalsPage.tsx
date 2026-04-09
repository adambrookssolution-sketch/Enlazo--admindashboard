import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  FileText,
  Calendar,
  X,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  LayoutGrid,
  Table
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SpecialistProfile {
  id: string;
  user_id: string;
  phone: string;
  email: string | null;
  rfc: string;
  razon_social: string | null;
  person_type: string | null;
  specialist_type: string | null;
  professional_description: string | null;
  profile_photo_url: string | null;
  id_document_url: string | null;
  csf_document_url: string | null;
  address_proof_url: string | null;
  status: string;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  postal_code: string | null;
  street: string | null;
  street_number: string | null;
  birth_or_constitution_date: string | null;
  licenses_certifications: string | null;
  materials_policy: string | null;
  warranty_days: number | null;
  accepted_terms_at: string | null;
  created_at: string;
  updated_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  profile?: {
    first_name: string;
    last_name_paterno: string | null;
    last_name_materno: string | null;
    display_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  };
  categories?: Array<{
    category: {
      name: string;
    };
  }>;
}

type StatusFilter = 'all' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'suspended';
type ViewMode = 'table' | 'kanban';

const FONT_BODY = "'Centrale Sans Rounded', sans-serif";
const FONT_HEADER = "'Isidora Alt Bold', sans-serif";
const COLOR_PRIMARY = '#36004E';
const COLOR_ACCENT = '#AA1BF1';

const KANBAN_COLUMNS = [
  { key: 'pending', label: 'Pendientes', color: '#FEF3C7', textColor: '#A16207' },
  { key: 'in_review', label: 'En curso', color: '#DBEAFE', textColor: '#1D4ED8' },
  { key: 'approved', label: 'Aprobados', color: '#DCFCE7', textColor: '#15803D' },
  { key: 'rejected', label: 'Rechazados', color: '#FEE2E2', textColor: '#B91C1C' },
  { key: 'suspended', label: 'Suspendido', color: '#FFEDD5', textColor: '#C2410C' },
] as const;

export function ApprovalsPage() {
  const [specialists, setSpecialists] = useState<SpecialistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistProfile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showSuspendInput, setShowSuspendInput] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  useEffect(() => {
    loadSpecialists();
  }, []);

  async function loadSpecialists() {
    try {
      const { data, error } = await supabase
        .from('specialist_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = data?.map((s: any) => s.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name_paterno, last_name_materno, display_name, avatar_url, phone')
        .in('id', userIds);

      const specialistIds = data?.map((s: any) => s.id) || [];
      const { data: categories } = await supabase
        .from('specialist_categories')
        .select('specialist_id, category:categories(name)')
        .in('specialist_id', specialistIds);

      const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]));
      const categoriesMap = new Map<string, any[]>();
      categories?.forEach((c: any) => {
        const existing = categoriesMap.get(c.specialist_id) || [];
        existing.push(c);
        categoriesMap.set(c.specialist_id, existing);
      });

      const specialistsWithData = (data || []).map((s: any) => ({
        ...s,
        profile: profilesMap.get(s.user_id),
        categories: categoriesMap.get(s.id) || undefined,
      }));

      setSpecialists(specialistsWithData as SpecialistProfile[]);
    } catch (error) {
      console.error('Error loading specialists:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSpecialists = specialists.filter(specialist => {
    const fullName = `${specialist.profile?.first_name || ''} ${specialist.profile?.last_name_paterno || ''} ${specialist.profile?.last_name_materno || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      specialist.phone?.includes(searchQuery) ||
      specialist.rfc?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || specialist.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function getFullName(specialist: SpecialistProfile): string {
    if (!specialist.profile) return 'Sin nombre';
    return `${specialist.profile.first_name} ${specialist.profile.last_name_paterno || ''} ${specialist.profile.last_name_materno || ''}`.trim();
  }

  function getStatusBadge(status: string) {
    const baseStyle: React.CSSProperties = {
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: 500,
      borderRadius: '9999px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: FONT_BODY,
      whiteSpace: 'nowrap'
    };

    switch (status) {
      case 'approved':
        return (
          <span style={{ ...baseStyle, backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <CheckCircle style={{ width: '12px', height: '12px' }} /> Aprobado
          </span>
        );
      case 'rejected':
        return (
          <span style={{ ...baseStyle, backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
            <XCircle style={{ width: '12px', height: '12px' }} /> Rechazado
          </span>
        );
      case 'suspended':
        return (
          <span style={{ ...baseStyle, backgroundColor: '#FFEDD5', color: '#C2410C' }}>
            <AlertCircle style={{ width: '12px', height: '12px' }} /> Suspendido
          </span>
        );
      case 'in_review':
        return (
          <span style={{ ...baseStyle, backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
            <Eye style={{ width: '12px', height: '12px' }} /> En curso
          </span>
        );
      default:
        return (
          <span style={{ ...baseStyle, backgroundColor: '#FEF3C7', color: '#A16207' }}>
            <Clock style={{ width: '12px', height: '12px' }} /> Pendiente
          </span>
        );
    }
  }

  async function handleApprove(specialist: SpecialistProfile) {
    setActionLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('specialist_profiles')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: authUser?.id || null,
          rejection_reason: null,
          suspended_reason: null,
          suspended_at: null,
          suspended_by: null,
        })
        .eq('id', specialist.id);

      if (updateError) throw updateError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: specialist.user_id,
          role: 'specialist'
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      await loadSpecialists();
      setShowDetailModal(false);
      setSelectedSpecialist(null);
      setExpandedRowId(null);
    } catch (error) {
      console.error('Error approving specialist:', error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(specialist: SpecialistProfile) {
    if (!rejectionReason.trim()) {
      setShowRejectionInput(true);
      return;
    }

    setActionLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('specialist_profiles')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          rejected_at: new Date().toISOString(),
          rejected_by: authUser?.id || null,
        })
        .eq('id', specialist.id);

      if (updateError) throw updateError;

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', specialist.user_id)
        .eq('role', 'specialist');

      await loadSpecialists();
      setShowDetailModal(false);
      setSelectedSpecialist(null);
      setRejectionReason('');
      setShowRejectionInput(false);
      setExpandedRowId(null);
    } catch (error: any) {
      alert('Error al rechazar: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspend(specialist: SpecialistProfile) {
    if (!suspendReason.trim()) return;
    setActionLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('specialist_profiles')
        .update({
          status: 'suspended',
          suspended_reason: suspendReason.trim(),
          suspended_at: new Date().toISOString(),
          suspended_by: authUser?.id || null,
        })
        .eq('id', specialist.id);

      if (updateError) throw updateError;

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', specialist.user_id)
        .eq('role', 'specialist');

      await loadSpecialists();
      setShowSuspendInput(false);
      setSuspendReason('');
      setShowDetailModal(false);
      setSelectedSpecialist(null);
      setExpandedRowId(null);
    } catch (error: any) {
      alert('Error al suspender: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevoke(specialist: SpecialistProfile) {
    setActionLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('specialist_profiles')
        .update({
          status: 'rejected',
          rejection_reason: 'Revocado por administrador',
          rejected_at: new Date().toISOString(),
          rejected_by: authUser?.id || null,
        })
        .eq('id', specialist.id);

      if (updateError) throw updateError;

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', specialist.user_id)
        .eq('role', 'specialist');

      await loadSpecialists();
      setShowRevokeConfirm(false);
      setShowDetailModal(false);
      setSelectedSpecialist(null);
      setExpandedRowId(null);
    } catch (error) {
      console.error('Error revoking specialist:', error);
    } finally {
      setActionLoading(false);
    }
  }

  function renderDocLink(url: string | null, label: string) {
    if (!url) {
      return (
        <span style={{
          padding: '2px 10px',
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: '9999px',
          backgroundColor: '#FEE2E2',
          color: '#B91C1C',
          fontFamily: FONT_BODY
        }}>
          Falta
        </span>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: COLOR_ACCENT,
          textDecoration: 'none',
          fontFamily: FONT_BODY,
          fontSize: '13px',
          fontWeight: 500
        }}
      >
        <ExternalLink style={{ width: '14px', height: '14px' }} />
        Ver
      </a>
    );
  }

  function renderActionButtons(specialist: SpecialistProfile, size: number = 18) {
    const iconStyle = { width: `${size}px`, height: `${size}px` };
    const btnBase: React.CSSProperties = {
      padding: '6px',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center'
    };
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedSpecialist(specialist); setShowDetailModal(true); }}
          style={{ ...btnBase, color: '#9CA3AF' }}
          title="Ver detalles"
        >
          <Eye style={iconStyle} />
        </button>
        {specialist.status === 'pending' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handleApprove(specialist); }}
              style={{ ...btnBase, color: '#16A34A' }}
              title="Aprobar"
            >
              <CheckCircle style={iconStyle} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedSpecialist(specialist); setShowRejectionInput(true); }}
              style={{ ...btnBase, color: '#DC2626' }}
              title="Rechazar"
            >
              <XCircle style={iconStyle} />
            </button>
          </>
        )}
        {specialist.status === 'in_review' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handleApprove(specialist); }}
              style={{ ...btnBase, color: '#16A34A' }}
              title="Aprobar"
            >
              <CheckCircle style={iconStyle} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedSpecialist(specialist); setShowRejectionInput(true); }}
              style={{ ...btnBase, color: '#DC2626' }}
              title="Rechazar"
            >
              <XCircle style={iconStyle} />
            </button>
          </>
        )}
        {specialist.status === 'approved' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedSpecialist(specialist); setShowSuspendInput(true); }}
              style={{ ...btnBase, color: '#C2410C' }}
              title="Suspender"
            >
              <AlertCircle style={iconStyle} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedSpecialist(specialist); setShowRevokeConfirm(true); }}
              style={{ ...btnBase, color: '#DC2626' }}
              title="Revocar"
            >
              <XCircle style={iconStyle} />
            </button>
          </>
        )}
        {specialist.status === 'suspended' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleApprove(specialist); }}
            style={{ ...btnBase, color: '#16A34A' }}
            title="Reactivar"
          >
            <CheckCircle style={iconStyle} />
          </button>
        )}
        {specialist.status === 'rejected' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleApprove(specialist); }}
            style={{ ...btnBase, color: '#16A34A' }}
            title="Reactivar"
          >
            <CheckCircle style={iconStyle} />
          </button>
        )}
      </div>
    );
  }

  function renderExpandedRow(specialist: SpecialistProfile) {
    const infoItem = (label: string, value: string | null | undefined) => (
      <div style={{ padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 2px 0' }}>{label}</p>
        <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0, fontSize: '13px' }}>{value || 'N/A'}</p>
      </div>
    );

    return (
      <tr>
        <td colSpan={8} style={{ padding: 0, border: 'none' }}>
          <div style={{
            padding: '20px 24px',
            backgroundColor: '#FAFBFC',
            borderBottom: '1px solid #E5E7EB',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '16px' }}>
              {specialist.profile_photo_url ? (
                <img src={specialist.profile_photo_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '72px', height: '72px', borderRadius: '12px', background: 'linear-gradient(135deg, #FF9601 0%, #AA1BF1 50%, #009AFF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '22px', fontWeight: 'bold', fontFamily: FONT_HEADER, flexShrink: 0 }}>
                  {specialist.profile?.first_name?.[0] || 'E'}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <h4 style={{ fontFamily: FONT_HEADER, fontSize: '18px', fontWeight: 'bold', color: COLOR_PRIMARY, margin: 0 }}>
                    {getFullName(specialist)}
                  </h4>
                  {getStatusBadge(specialist.status)}
                </div>
                {specialist.razon_social && (
                  <p style={{ fontFamily: FONT_BODY, color: '#4B5563', margin: '2px 0 0 0', fontSize: '14px' }}>{specialist.razon_social}</p>
                )}
              </div>
              <div>{renderActionButtons(specialist)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              {infoItem('RFC', specialist.rfc)}
              {infoItem('Tipo de Persona', specialist.person_type === 'fisica' ? 'Fisica' : specialist.person_type === 'moral' ? 'Moral' : specialist.person_type)}
              {infoItem('Tipo de Especialista', specialist.specialist_type)}
              {infoItem('Telefono', specialist.phone)}
              {infoItem('Email', specialist.email)}
              {infoItem('Estado', specialist.state)}
              {infoItem('Ciudad', specialist.city)}
              {infoItem('Colonia', specialist.neighborhood)}
              {infoItem('Codigo Postal', specialist.postal_code)}
              {infoItem('Calle', specialist.street)}
              {infoItem('Numero', specialist.street_number)}
              {infoItem('Fecha de Nacimiento / Constitucion', specialist.birth_or_constitution_date ? new Date(specialist.birth_or_constitution_date).toLocaleDateString('es-MX') : null)}
              {infoItem('Dias de Garantia', specialist.warranty_days?.toString())}
              {infoItem('Politica de Materiales', specialist.materials_policy)}
              {infoItem('Fecha de Registro', new Date(specialist.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }))}
              {infoItem('Ultima Actualizacion', specialist.updated_at ? new Date(specialist.updated_at).toLocaleDateString('es-MX') : null)}
            </div>

            {specialist.licenses_certifications && (
              <div style={{ padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: '10px', marginBottom: '10px' }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Licencias y Certificaciones</p>
                <p style={{ fontFamily: FONT_BODY, color: COLOR_PRIMARY, margin: 0, fontSize: '13px' }}>{specialist.licenses_certifications}</p>
              </div>
            )}

            {specialist.professional_description && (
              <div style={{ padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: '10px', marginBottom: '10px' }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Descripcion Profesional</p>
                <p style={{ fontFamily: FONT_BODY, color: COLOR_PRIMARY, margin: 0, fontSize: '13px' }}>{specialist.professional_description}</p>
              </div>
            )}

            {/* Documents section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div style={{ padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 6px 0' }}>INE</p>
                {renderDocLink(specialist.id_document_url, 'INE')}
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 6px 0' }}>Constancia de Situacion Fiscal</p>
                {renderDocLink(specialist.csf_document_url, 'CSF')}
              </div>
              <div style={{ padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 6px 0' }}>Comprobante de Domicilio</p>
                {renderDocLink(specialist.address_proof_url, 'Comprobante de Domicilio')}
              </div>
            </div>

            {specialist.categories && specialist.categories.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 6px 0' }}>Categorias</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {specialist.categories.map((cat, idx) => (
                    <span key={idx} style={{ padding: '3px 10px', fontSize: '12px', backgroundColor: 'rgba(170,27,241,0.1)', color: COLOR_ACCENT, borderRadius: '9999px', fontFamily: FONT_BODY }}>
                      {cat.category?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {specialist.rejection_reason && (
              <div style={{ padding: '12px 14px', backgroundColor: '#FEF2F2', borderRadius: '10px', marginBottom: '10px' }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#B91C1C', margin: '0 0 4px 0' }}>Razon del Rechazo</p>
                <p style={{ fontFamily: FONT_BODY, color: '#991B1B', margin: 0, fontSize: '13px' }}>{specialist.rejection_reason}</p>
              </div>
            )}
            {specialist.suspended_reason && (
              <div style={{ padding: '12px 14px', backgroundColor: '#FFF7ED', borderRadius: '10px', marginBottom: '10px' }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#C2410C', margin: '0 0 4px 0' }}>Razon de la Suspension</p>
                <p style={{ fontFamily: FONT_BODY, color: '#9A3412', margin: 0, fontSize: '13px' }}>{specialist.suspended_reason}</p>
              </div>
            )}

            {specialist.accepted_terms_at && (
              <p style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#9CA3AF', margin: '8px 0 0 0' }}>
                Terminos aceptados: {new Date(specialist.accepted_terms_at).toLocaleDateString('es-MX')}
              </p>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function renderTableView() {
    const thStyle: React.CSSProperties = {
      padding: '12px 16px',
      textAlign: 'left',
      fontFamily: FONT_BODY,
      fontSize: '12px',
      fontWeight: 600,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderBottom: '2px solid #E5E7EB',
      whiteSpace: 'nowrap',
      backgroundColor: '#FAFBFC'
    };
    const tdStyle: React.CSSProperties = {
      padding: '12px 16px',
      fontFamily: FONT_BODY,
      fontSize: '14px',
      color: '#374151',
      borderBottom: '1px solid #F3F4F6',
      verticalAlign: 'middle'
    };

    return (
      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '40px' }}></th>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>INE</th>
                <th style={{ ...thStyle, whiteSpace: 'normal', minWidth: '120px' }}>Constancia de Situacion Fiscal</th>
                <th style={{ ...thStyle, whiteSpace: 'normal', minWidth: '120px' }}>Comprobante de Domicilio</th>
                <th style={thStyle}>Numero Celular</th>
                <th style={thStyle}>Correo Electronico</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpecialists.map((specialist) => {
                const isExpanded = expandedRowId === specialist.id;
                return (
                  <>
                    <tr
                      key={specialist.id}
                      onClick={() => setExpandedRowId(isExpanded ? null : specialist.id)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isExpanded ? '#F9FAFB' : 'white',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFBFC'; }}
                      onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = 'white'; }}
                    >
                      <td style={tdStyle}>
                        <ChevronDown style={{
                          width: '16px',
                          height: '16px',
                          color: '#9CA3AF',
                          transition: 'transform 0.2s ease',
                          transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
                        }} />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {specialist.profile_photo_url ? (
                            <img src={specialist.profile_photo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #FF9601 0%, #AA1BF1 50%, #009AFF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 'bold', fontFamily: FONT_HEADER, flexShrink: 0 }}>
                              {specialist.profile?.first_name?.[0] || 'E'}
                            </div>
                          )}
                          <span style={{ fontWeight: 500, color: COLOR_PRIMARY }}>{getFullName(specialist)}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>{renderDocLink(specialist.id_document_url, 'INE')}</td>
                      <td style={tdStyle}>{renderDocLink(specialist.csf_document_url, 'CSF')}</td>
                      <td style={tdStyle}>{renderDocLink(specialist.address_proof_url, 'Comprobante')}</td>
                      <td style={tdStyle}>{specialist.phone || 'N/A'}</td>
                      <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{specialist.email || 'N/A'}</td>
                      <td style={tdStyle}>{getStatusBadge(specialist.status)}</td>
                      <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                        {renderActionButtons(specialist, 16)}
                      </td>
                    </tr>
                    {isExpanded && renderExpandedRow(specialist)}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSpecialists.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <FileText style={{ width: '48px', height: '48px', color: '#D1D5DB', margin: '0 auto 16px' }} />
            <p style={{ fontFamily: FONT_BODY, color: '#6B7280' }}>No se encontraron especialistas</p>
          </div>
        )}
      </div>
    );
  }

  function renderKanbanView() {
    const getSpecialistsForColumn = (key: string) => {
      return filteredSpecialists.filter(s => s.status === key);
    };

    return (
      <div style={{
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '16px',
        minHeight: '400px'
      }}>
        {KANBAN_COLUMNS.map((col) => {
          const colSpecialists = getSpecialistsForColumn(col.key);
          return (
            <div
              key={col.key}
              style={{
                flex: '0 0 280px',
                minWidth: '280px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 280px)'
              }}
            >
              {/* Column header */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: col.color,
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{
                  fontFamily: FONT_HEADER,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: col.textColor,
                  margin: 0
                }}>
                  {col.label}
                </h3>
                <span style={{
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  color: col.textColor,
                  fontFamily: FONT_BODY
                }}>
                  {colSpecialists.length}
                </span>
              </div>

              {/* Column body */}
              <div style={{
                flex: 1,
                backgroundColor: '#F9FAFB',
                borderRadius: '0 0 12px 12px',
                padding: '12px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                border: '1px solid #E5E7EB',
                borderTop: 'none'
              }}>
                {colSpecialists.length === 0 && (
                  <p style={{ fontFamily: FONT_BODY, fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>
                    Sin especialistas
                  </p>
                )}
                {colSpecialists.map((specialist) => (
                  <div
                    key={specialist.id}
                    onClick={() => { setSelectedSpecialist(specialist); setShowDetailModal(true); }}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      border: '1px solid #F3F4F6',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s ease, transform 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      {specialist.profile_photo_url ? (
                        <img src={specialist.profile_photo_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #FF9601 0%, #AA1BF1 50%, #009AFF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '15px', fontWeight: 'bold', fontFamily: FONT_HEADER, flexShrink: 0 }}>
                          {specialist.profile?.first_name?.[0] || 'E'}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontFamily: FONT_HEADER,
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: COLOR_PRIMARY,
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {getFullName(specialist)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280' }}>
                        <FileText style={{ width: '12px', height: '12px', color: '#9CA3AF', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>RFC: {specialist.rfc || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280' }}>
                        <Calendar style={{ width: '12px', height: '12px', color: '#9CA3AF', flexShrink: 0 }} />
                        <span>{new Date(specialist.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const pendingCount = specialists.filter(s => s.status === 'pending').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '4px solid rgba(170,27,241,0.3)',
            borderTopColor: COLOR_ACCENT,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: FONT_HEADER, fontSize: '20px', fontWeight: 'bold', color: COLOR_PRIMARY, margin: 0 }}>
            Aprobacion de Especialistas
          </h2>
          <p style={{ fontFamily: FONT_BODY, fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>
            {pendingCount} especialistas pendientes de aprobacion
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: '10px', padding: '3px' }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: FONT_BODY,
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: viewMode === 'table' ? 'white' : 'transparent',
              color: viewMode === 'table' ? COLOR_PRIMARY : '#6B7280',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Table style={{ width: '16px', height: '16px' }} />
            Tabla
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: FONT_BODY,
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: viewMode === 'kanban' ? 'white' : 'transparent',
              color: viewMode === 'kanban' ? COLOR_PRIMARY : '#6B7280',
              boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutGrid style={{ width: '16px', height: '16px' }} />
            Kanban
          </button>
        </div>
      </div>

      {/* Alert for pending */}
      {pendingCount > 0 && (
        <div style={{ padding: '16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertCircle style={{ width: '20px', height: '20px', color: '#D97706', flexShrink: 0 }} />
          <p style={{ fontFamily: FONT_BODY, color: '#92400E', margin: 0 }}>
            Hay <strong>{pendingCount}</strong> especialistas esperando aprobacion
          </p>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, telefono, RFC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 48px',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: FONT_BODY,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter style={{ width: '20px', height: '20px', color: '#9CA3AF' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={{
              padding: '12px 16px',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: FONT_BODY,
              backgroundColor: 'white',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="in_review">En curso</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' ? renderTableView() : renderKanbanView()}

      {/* Detail Modal */}
      {showDetailModal && selectedSpecialist && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ position: 'sticky', top: 0, backgroundColor: 'white', borderBottom: '1px solid #F3F4F6', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
              <h3 style={{ fontFamily: FONT_HEADER, fontSize: '18px', fontWeight: 'bold', color: COLOR_PRIMARY, margin: 0 }}>
                Detalles del Especialista
              </h3>
              <button onClick={() => { setShowDetailModal(false); setSelectedSpecialist(null); }} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                {selectedSpecialist.profile_photo_url ? (
                  <img src={selectedSpecialist.profile_photo_url} alt="" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'linear-gradient(135deg, #FF9601 0%, #AA1BF1 50%, #009AFF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold', fontFamily: FONT_HEADER }}>
                    {selectedSpecialist.profile?.first_name?.[0] || 'E'}
                  </div>
                )}
                <div>
                  <h4 style={{ fontFamily: FONT_HEADER, fontSize: '20px', fontWeight: 'bold', color: COLOR_PRIMARY, margin: 0 }}>
                    {getFullName(selectedSpecialist)}
                  </h4>
                  {selectedSpecialist.razon_social && (
                    <p style={{ fontFamily: FONT_BODY, color: '#4B5563', margin: '4px 0 0 0' }}>{selectedSpecialist.razon_social}</p>
                  )}
                  <div style={{ marginTop: '8px' }}>{getStatusBadge(selectedSpecialist.status)}</div>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>RFC</p>
                  <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.rfc}</p>
                </div>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Tipo de Persona</p>
                  <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.person_type === 'fisica' ? 'Fisica' : selectedSpecialist.person_type === 'moral' ? 'Moral' : selectedSpecialist.person_type || 'N/A'}</p>
                </div>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Tipo de Especialista</p>
                  <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.specialist_type || 'N/A'}</p>
                </div>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Telefono</p>
                  <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.phone}</p>
                </div>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Email</p>
                  <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.email || 'No proporcionado'}</p>
                </div>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Fecha de Nacimiento / Constitucion</p>
                  <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.birth_or_constitution_date ? new Date(selectedSpecialist.birth_or_constitution_date).toLocaleDateString('es-MX') : 'N/A'}</p>
                </div>
              </div>

              {/* Address */}
              <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 6px 0' }}>Direccion</p>
                <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>
                  {[selectedSpecialist.street, selectedSpecialist.street_number].filter(Boolean).join(' #') || ''}{selectedSpecialist.neighborhood ? `, Col. ${selectedSpecialist.neighborhood}` : ''}{selectedSpecialist.city ? `, ${selectedSpecialist.city}` : ''}{selectedSpecialist.state ? `, ${selectedSpecialist.state}` : ''}{selectedSpecialist.postal_code ? ` C.P. ${selectedSpecialist.postal_code}` : ''}
                  {!selectedSpecialist.street && !selectedSpecialist.city && !selectedSpecialist.state ? 'N/A' : ''}
                </p>
              </div>

              {/* Extra fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Dias de Garantia</p>
                  <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.warranty_days ?? 'N/A'}</p>
                </div>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Politica de Materiales</p>
                  <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.materials_policy || 'N/A'}</p>
                </div>
              </div>

              {selectedSpecialist.licenses_certifications && (
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px', marginBottom: '16px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 6px 0' }}>Licencias y Certificaciones</p>
                  <p style={{ fontFamily: FONT_BODY, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.licenses_certifications}</p>
                </div>
              )}

              {/* Description */}
              {selectedSpecialist.professional_description && (
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px', marginBottom: '16px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 6px 0' }}>Descripcion Profesional</p>
                  <p style={{ fontFamily: FONT_BODY, color: COLOR_PRIMARY, margin: 0 }}>{selectedSpecialist.professional_description}</p>
                </div>
              )}

              {/* Categories */}
              {selectedSpecialist.categories && selectedSpecialist.categories.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 8px 0' }}>Categorias</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedSpecialist.categories.map((cat, idx) => (
                      <span key={idx} style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'rgba(170,27,241,0.1)', color: COLOR_ACCENT, borderRadius: '9999px', fontFamily: FONT_BODY }}>
                        {cat.category?.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedSpecialist.rejection_reason && (
                <div style={{ padding: '14px', backgroundColor: '#FEF2F2', borderRadius: '12px', marginBottom: '16px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#B91C1C', margin: '0 0 6px 0' }}>Razon del Rechazo</p>
                  <p style={{ fontFamily: FONT_BODY, color: '#991B1B', margin: 0 }}>{selectedSpecialist.rejection_reason}</p>
                </div>
              )}
              {selectedSpecialist.suspended_reason && (
                <div style={{ padding: '14px', backgroundColor: '#FFF7ED', borderRadius: '12px', marginBottom: '16px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#C2410C', margin: '0 0 6px 0' }}>Razon de la Suspension</p>
                  <p style={{ fontFamily: FONT_BODY, color: '#9A3412', margin: 0 }}>{selectedSpecialist.suspended_reason}</p>
                </div>
              )}

              {/* Documents */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 8px 0' }}>INE</p>
                  {renderDocLink(selectedSpecialist.id_document_url, 'INE')}
                </div>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 8px 0' }}>Constancia Fiscal</p>
                  {renderDocLink(selectedSpecialist.csf_document_url, 'CSF')}
                </div>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 8px 0' }}>Comprobante Domicilio</p>
                  {renderDocLink(selectedSpecialist.address_proof_url, 'Comprobante de Domicilio')}
                </div>
              </div>

              {/* Timestamps */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Fecha de Registro</p>
                  <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{new Date(selectedSpecialist.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                {selectedSpecialist.approved_at && (
                  <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                    <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Fecha de Aprobacion</p>
                    <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{new Date(selectedSpecialist.approved_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
                {selectedSpecialist.rejected_at && (
                  <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                    <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Fecha de Rechazo</p>
                    <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{new Date(selectedSpecialist.rejected_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
                {selectedSpecialist.suspended_at && (
                  <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                    <p style={{ fontFamily: FONT_BODY, fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>Fecha de Suspension</p>
                    <p style={{ fontFamily: FONT_BODY, fontWeight: 500, color: COLOR_PRIMARY, margin: 0 }}>{new Date(selectedSpecialist.suspended_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
              </div>

              {selectedSpecialist.accepted_terms_at && (
                <p style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#9CA3AF', margin: '0 0 16px 0' }}>
                  Terminos aceptados: {new Date(selectedSpecialist.accepted_terms_at).toLocaleDateString('es-MX')}
                </p>
              )}

              {/* Actions */}
              {selectedSpecialist.status === 'pending' && (
                <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                  <button
                    onClick={() => handleReject(selectedSpecialist)}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '12px 16px', border: '1px solid #FCA5A5', backgroundColor: 'white', color: '#DC2626', fontWeight: 500, borderRadius: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, fontFamily: FONT_BODY }}
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(selectedSpecialist)}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '12px 16px', border: 'none', backgroundColor: '#16A34A', color: 'white', fontWeight: 500, borderRadius: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, fontFamily: FONT_BODY }}
                  >
                    {actionLoading ? 'Cargando...' : 'Aprobar'}
                  </button>
                </div>
              )}
              {selectedSpecialist.status === 'in_review' && (
                <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                  <button
                    onClick={() => handleReject(selectedSpecialist)}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '12px 16px', border: '1px solid #FCA5A5', backgroundColor: 'white', color: '#DC2626', fontWeight: 500, borderRadius: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, fontFamily: FONT_BODY }}
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(selectedSpecialist)}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '12px 16px', border: 'none', backgroundColor: '#16A34A', color: 'white', fontWeight: 500, borderRadius: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, fontFamily: FONT_BODY }}
                  >
                    {actionLoading ? 'Cargando...' : 'Aprobar'}
                  </button>
                </div>
              )}
              {selectedSpecialist.status === 'approved' && (
                <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                  <button
                    onClick={() => { setShowSuspendInput(true); }}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '12px 16px', border: '1px solid #FDBA74', backgroundColor: 'white', color: '#C2410C', fontWeight: 500, borderRadius: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, fontFamily: FONT_BODY }}
                  >
                    Suspender
                  </button>
                  <button
                    onClick={() => { setShowRevokeConfirm(true); }}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '12px 16px', border: '1px solid #FCA5A5', backgroundColor: 'white', color: '#DC2626', fontWeight: 500, borderRadius: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, fontFamily: FONT_BODY }}
                  >
                    Revocar
                  </button>
                </div>
              )}
              {selectedSpecialist.status === 'suspended' && (
                <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                  <button
                    onClick={() => handleApprove(selectedSpecialist)}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '12px 16px', border: 'none', backgroundColor: '#16A34A', color: 'white', fontWeight: 500, borderRadius: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, fontFamily: FONT_BODY }}
                  >
                    {actionLoading ? 'Cargando...' : 'Reactivar'}
                  </button>
                </div>
              )}
              {selectedSpecialist.status === 'rejected' && (
                <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                  <button
                    onClick={() => handleApprove(selectedSpecialist)}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '12px 16px', border: 'none', backgroundColor: '#16A34A', color: 'white', fontWeight: 500, borderRadius: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, fontFamily: FONT_BODY }}
                  >
                    {actionLoading ? 'Cargando...' : 'Reactivar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionInput && selectedSpecialist && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: FONT_HEADER, fontSize: '18px', fontWeight: 'bold', color: COLOR_PRIMARY, margin: 0 }}>
                Rechazar Especialista
              </h3>
              <button onClick={() => { setShowRejectionInput(false); setRejectionReason(''); }} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <p style={{ fontFamily: FONT_BODY, color: '#4B5563', marginBottom: '16px' }}>
              Por favor, indica la razon del rechazo para <strong>{getFullName(selectedSpecialist)}</strong>
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', fontFamily: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              rows={4}
              placeholder="Escribe la razon del rechazo..."
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => { setShowRejectionInput(false); setRejectionReason(''); }} style={{ flex: 1, padding: '12px 16px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: 500, borderRadius: '12px', cursor: 'pointer', fontFamily: FONT_BODY }}>
                Cancelar
              </button>
              <button
                onClick={() => handleReject(selectedSpecialist)}
                disabled={!rejectionReason.trim() || actionLoading}
                style={{ flex: 1, padding: '12px 16px', border: 'none', backgroundColor: '#DC2626', color: 'white', fontWeight: 500, borderRadius: '12px', cursor: (!rejectionReason.trim() || actionLoading) ? 'not-allowed' : 'pointer', opacity: (!rejectionReason.trim() || actionLoading) ? 0.5 : 1, fontFamily: FONT_BODY }}
              >
                {actionLoading ? 'Cargando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendInput && selectedSpecialist && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: FONT_HEADER, fontSize: '18px', fontWeight: 'bold', color: COLOR_PRIMARY, margin: 0 }}>
                Suspender Especialista
              </h3>
              <button onClick={() => { setShowSuspendInput(false); setSuspendReason(''); }} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            <p style={{ fontFamily: FONT_BODY, color: '#4B5563', marginBottom: '16px' }}>
              Indica la razon de la suspension de <strong>{getFullName(selectedSpecialist)}</strong>
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', fontFamily: FONT_BODY, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              rows={4}
              placeholder="Escribe la razon de la suspension..."
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => { setShowSuspendInput(false); setSuspendReason(''); }} style={{ flex: 1, padding: '12px 16px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: 500, borderRadius: '12px', cursor: 'pointer', fontFamily: FONT_BODY }}>
                Cancelar
              </button>
              <button
                onClick={() => handleSuspend(selectedSpecialist)}
                disabled={!suspendReason.trim() || actionLoading}
                style={{ flex: 1, padding: '12px 16px', border: 'none', backgroundColor: '#C2410C', color: 'white', fontWeight: 500, borderRadius: '12px', cursor: (!suspendReason.trim() || actionLoading) ? 'not-allowed' : 'pointer', opacity: (!suspendReason.trim() || actionLoading) ? 0.5 : 1, fontFamily: FONT_BODY }}
              >
                {actionLoading ? 'Cargando...' : 'Suspender'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeConfirm && selectedSpecialist && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: FONT_HEADER, fontSize: '18px', fontWeight: 'bold', color: COLOR_PRIMARY, margin: 0 }}>
                Revocar Especialista
              </h3>
              <button onClick={() => { setShowRevokeConfirm(false); setSelectedSpecialist(null); }} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '12px', marginBottom: '16px' }}>
              <AlertCircle style={{ width: '24px', height: '24px', color: '#DC2626' }} />
              <p style={{ fontFamily: FONT_BODY, color: '#991B1B', margin: 0, fontSize: '14px' }}>
                Esta accion revocara el estado de especialista
              </p>
            </div>

            <p style={{ fontFamily: FONT_BODY, color: '#4B5563', marginBottom: '24px' }}>
              Estas seguro de que deseas revocar el estado de especialista de <strong>{getFullName(selectedSpecialist)}</strong>? El usuario perdera sus privilegios de especialista.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowRevokeConfirm(false); setSelectedSpecialist(null); }} style={{ flex: 1, padding: '12px 16px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: 500, borderRadius: '12px', cursor: 'pointer', fontFamily: FONT_BODY }}>
                Cancelar
              </button>
              <button
                onClick={() => handleRevoke(selectedSpecialist)}
                disabled={actionLoading}
                style={{ flex: 1, padding: '12px 16px', border: 'none', backgroundColor: '#DC2626', color: 'white', fontWeight: 500, borderRadius: '12px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, fontFamily: FONT_BODY }}
              >
                {actionLoading ? 'Cargando...' : 'Revocar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
