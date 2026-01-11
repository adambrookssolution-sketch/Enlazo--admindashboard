import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  X,
  ChevronRight,
  AlertCircle
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
  id_document_url: string;
  status: string;
  created_at: string;
  state: string | null;
  city: string | null;
  profile?: {
    first_name: string;
    last_name_paterno: string | null;
    last_name_materno: string | null;
  };
  categories?: Array<{
    category: {
      category_name: string;
    };
  }>;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export function ApprovalsPage() {
  const [specialists, setSpecialists] = useState<SpecialistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistProfile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  useEffect(() => {
    loadSpecialists();
  }, []);

  async function loadSpecialists() {
    try {
      const { data, error } = await supabase
        .from('specialist_profiles')
        .select(`
          id,
          user_id,
          phone,
          email,
          rfc,
          razon_social,
          person_type,
          specialist_type,
          professional_description,
          profile_photo_url,
          id_document_url,
          status,
          created_at,
          state,
          city
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for names
      const userIds = data?.map(s => s.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name_paterno, last_name_materno')
        .in('id', userIds);

      // Fetch categories
      const specialistIds = data?.map(s => s.id) || [];
      const { data: categories } = await supabase
        .from('specialist_categories')
        .select('specialist_id, category:categories(category_name)')
        .in('specialist_id', specialistIds);

      // Map profiles and categories to specialists
      const profilesMap = new Map(profiles?.map(p => [p.id, p]));
      const categoriesMap = new Map<string, typeof categories>();
      categories?.forEach(c => {
        const existing = categoriesMap.get(c.specialist_id) || [];
        existing.push(c);
        categoriesMap.set(c.specialist_id, existing);
      });

      const specialistsWithData = (data || []).map(s => ({
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
    const fullName = `${specialist.profile?.first_name || ''} ${specialist.profile?.last_name_paterno || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      specialist.phone.includes(searchQuery) ||
      specialist.rfc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || specialist.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function getFullName(specialist: SpecialistProfile): string {
    if (!specialist.profile) return 'Sin nombre';
    return `${specialist.profile.first_name} ${specialist.profile.last_name_paterno || ''} ${specialist.profile.last_name_materno || ''}`.trim();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'approved':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Aprobado
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rechazado
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
    }
  }

  async function handleApprove(specialist: SpecialistProfile) {
    setActionLoading(true);
    try {
      // Update specialist status
      const { error: updateError } = await supabase
        .from('specialist_profiles')
        .update({ status: 'approved' })
        .eq('id', specialist.id);

      if (updateError) throw updateError;

      // Add specialist role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: specialist.user_id,
          role: 'specialist'
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // Refresh list
      await loadSpecialists();
      setShowDetailModal(false);
      setSelectedSpecialist(null);
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
      // Update specialist status
      const { error: updateError } = await supabase
        .from('specialist_profiles')
        .update({ status: 'rejected' })
        .eq('id', specialist.id);

      if (updateError) throw updateError;

      // Remove specialist role if exists
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', specialist.user_id)
        .eq('role', 'specialist');

      // Refresh list
      await loadSpecialists();
      setShowDetailModal(false);
      setSelectedSpecialist(null);
      setRejectionReason('');
      setShowRejectionInput(false);
    } catch (error) {
      console.error('Error rejecting specialist:', error);
    } finally {
      setActionLoading(false);
    }
  }

  const pendingCount = specialists.filter(s => s.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-morado-confianza/30 border-t-morado-confianza rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-conexion-profunda">
            Aprobacion de Especialistas
          </h2>
          <p className="text-gray-500 text-sm">
            {pendingCount} especialistas pendientes de aprobacion
          </p>
        </div>
      </div>

      {/* Alert for pending */}
      {pendingCount > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-yellow-800">
            Hay <strong>{pendingCount}</strong> especialistas esperando aprobacion
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, telefono, RFC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morado-confianza focus:border-morado-confianza"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morado-confianza focus:border-morado-confianza bg-white"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Specialists List */}
      <div className="space-y-4">
        {filteredSpecialists.map((specialist) => (
          <div
            key={specialist.id}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {/* Photo */}
              {specialist.profile_photo_url ? (
                <img
                  src={specialist.profile_photo_url}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl gradient-brand flex items-center justify-center text-white text-xl font-bold">
                  {specialist.profile?.first_name?.[0] || 'E'}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-conexion-profunda text-lg">
                      {getFullName(specialist)}
                    </h3>
                    {specialist.razon_social && (
                      <p className="text-gray-600">{specialist.razon_social}</p>
                    )}
                  </div>
                  {getStatusBadge(specialist.status)}
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {specialist.phone}
                  </div>
                  {specialist.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {specialist.email}
                    </div>
                  )}
                  {specialist.state && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {specialist.city}, {specialist.state}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(specialist.created_at).toLocaleDateString('es-MX')}
                  </div>
                </div>

                {/* Categories */}
                {specialist.categories && specialist.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {specialist.categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-morado-confianza/10 text-morado-confianza rounded-full"
                      >
                        {cat.category?.category_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedSpecialist(specialist);
                    setShowDetailModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-morado-confianza hover:bg-morado-confianza/10 rounded-lg transition-colors"
                  title="Ver detalles"
                >
                  <Eye className="w-5 h-5" />
                </button>
                {specialist.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(specialist)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Aprobar"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSpecialist(specialist);
                        setShowRejectionInput(true);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Rechazar"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredSpecialists.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron especialistas</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSpecialist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-conexion-profunda">
                Detalles del Especialista
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSpecialist(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                {selectedSpecialist.profile_photo_url ? (
                  <img
                    src={selectedSpecialist.profile_photo_url}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl gradient-brand flex items-center justify-center text-white text-2xl font-bold">
                    {selectedSpecialist.profile?.first_name?.[0] || 'E'}
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-bold text-conexion-profunda">
                    {getFullName(selectedSpecialist)}
                  </h4>
                  {selectedSpecialist.razon_social && (
                    <p className="text-gray-600">{selectedSpecialist.razon_social}</p>
                  )}
                  {getStatusBadge(selectedSpecialist.status)}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">RFC</p>
                  <p className="font-medium text-conexion-profunda">{selectedSpecialist.rfc}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Tipo de Persona</p>
                  <p className="font-medium text-conexion-profunda">
                    {selectedSpecialist.person_type === 'fisica' ? 'Fisica' : 'Moral'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Telefono</p>
                  <p className="font-medium text-conexion-profunda">{selectedSpecialist.phone}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="font-medium text-conexion-profunda">{selectedSpecialist.email || 'No proporcionado'}</p>
                </div>
              </div>

              {/* Description */}
              {selectedSpecialist.professional_description && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2">Descripcion Profesional</p>
                  <p className="text-conexion-profunda">{selectedSpecialist.professional_description}</p>
                </div>
              )}

              {/* Document */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">Documento de Identidad</p>
                <a
                  href={selectedSpecialist.id_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-morado-confianza hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  Ver documento
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {/* Actions */}
              {selectedSpecialist.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleReject(selectedSpecialist)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-3 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(selectedSpecialist)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      'Aprobar'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionInput && selectedSpecialist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-conexion-profunda">
                Rechazar Especialista
              </h3>
              <button
                onClick={() => {
                  setShowRejectionInput(false);
                  setRejectionReason('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Por favor, indica la razon del rechazo para <strong>{getFullName(selectedSpecialist)}</strong>
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morado-confianza focus:border-morado-confianza resize-none"
              rows={4}
              placeholder="Escribe la razon del rechazo..."
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectionInput(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReject(selectedSpecialist)}
                disabled={!rejectionReason.trim() || actionLoading}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  'Rechazar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
