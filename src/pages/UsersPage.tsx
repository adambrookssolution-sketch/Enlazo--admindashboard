import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Ban,
  CheckCircle,
  Phone,
  Calendar,
  User,
  Shield,
  Briefcase,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  first_name: string;
  last_name_paterno: string | null;
  last_name_materno: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  email?: string;
  roles: string[];
  isBlocked: boolean;
}

type FilterRole = 'all' | 'user' | 'specialist' | 'admin';

export function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name_paterno, last_name_materno, display_name, avatar_url, phone, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user roles
      const rolesMap = new Map<string, string[]>();
      allRoles?.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      });

      // Combine data
      const usersWithRoles: UserProfile[] = (profiles || []).map(profile => ({
        ...profile,
        roles: rolesMap.get(profile.id) || ['user'],
        isBlocked: false, // TODO: Add blocked users table
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.last_name_paterno?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (user.phone?.includes(searchQuery) || false);

    const matchesRole =
      filterRole === 'all' ||
      user.roles.includes(filterRole);

    return matchesSearch && matchesRole;
  });

  function getFullName(user: UserProfile): string {
    return `${user.first_name} ${user.last_name_paterno || ''} ${user.last_name_materno || ''}`.trim();
  }

  function getRoleBadge(role: string) {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case 'specialist':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Especialista
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
            <User className="w-3 h-3" /> Usuario
          </span>
        );
    }
  }

  async function handleBlockUser() {
    if (!selectedUser || !blockReason.trim()) return;

    setActionLoading(true);
    try {
      // TODO: Implement block functionality with blocked_users table
      console.log('Blocking user:', selectedUser.id, 'Reason:', blockReason);
      setShowBlockModal(false);
      setBlockReason('');
      setSelectedUser(null);
    } catch (error) {
      console.error('Error blocking user:', error);
    } finally {
      setActionLoading(false);
    }
  }

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
            Gestion de Usuarios
          </h2>
          <p className="text-gray-500 text-sm">
            {filteredUsers.length} usuarios encontrados
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, telefono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morado-confianza focus:border-morado-confianza"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as FilterRole)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morado-confianza focus:border-morado-confianza bg-white"
          >
            <option value="all">Todos los roles</option>
            <option value="user">Usuarios</option>
            <option value="specialist">Especialistas</option>
            <option value="admin">Administradores</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Usuario</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Contacto</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Roles</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Registro</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white font-bold">
                          {user.first_name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-conexion-profunda">
                          {getFullName(user)}
                        </p>
                        {user.display_name && (
                          <p className="text-sm text-gray-500">@{user.display_name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span key={role}>{getRoleBadge(role)}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(user.created_at).toLocaleDateString('es-MX')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.isBlocked ? (
                      <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                        Bloqueado
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowBlockModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                      >
                        {user.isBlocked ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Ban className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Block User Modal */}
      {showBlockModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-conexion-profunda">
                {selectedUser.isBlocked ? 'Desbloquear Usuario' : 'Bloquear Usuario'}
              </h3>
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                  setSelectedUser(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-4">
              {selectedUser.avatar_url ? (
                <img
                  src={selectedUser.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-white font-bold">
                  {selectedUser.first_name[0]}
                </div>
              )}
              <div>
                <p className="font-medium text-conexion-profunda">
                  {getFullName(selectedUser)}
                </p>
                <p className="text-sm text-gray-500">{selectedUser.phone}</p>
              </div>
            </div>

            {!selectedUser.isBlocked && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razon del bloqueo
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morado-confianza focus:border-morado-confianza resize-none"
                  rows={3}
                  placeholder="Describe la razon del bloqueo..."
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBlockUser}
                disabled={!selectedUser.isBlocked && !blockReason.trim()}
                className={`flex-1 px-4 py-3 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedUser.isBlocked
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : selectedUser.isBlocked ? (
                  'Desbloquear'
                ) : (
                  'Bloquear'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
