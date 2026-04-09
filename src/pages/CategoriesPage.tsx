import { useEffect, useState, useRef } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  Users,
  X,
  Save,
  AlertTriangle,
  Upload,
  Eye,
  EyeOff,
  Table,
  Columns,
  GripVertical,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  icon_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  specialistCount?: number;
}

type ViewMode = 'table' | 'kanban';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon_url: '',
    is_active: true,
    sort_order: 0,
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (categoriesError) throw categoriesError;

      const { data: specialistCounts } = await supabase
        .from('specialist_categories')
        .select('category_id');

      const countsMap = new Map<string, number>();
      specialistCounts?.forEach((sc: any) => {
        if (sc.category_id) {
          countsMap.set(sc.category_id, (countsMap.get(sc.category_id) || 0) + 1);
        }
      });

      const categoriesWithData = (categoriesData || []).map((cat: any) => ({
        ...cat,
        specialistCount: countsMap.get(cat.id) || 0,
      }));

      setCategories(categoriesWithData);
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Error al cargar categorias: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  }

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && category.is_active) ||
      (statusFilter === 'inactive' && !category.is_active);
    return matchesSearch && matchesStatus;
  });

  function slugify(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function openCreateModal() {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon_url: '',
      is_active: true,
      sort_order: categories.length,
    });
    setIconFile(null);
    setIconPreview(null);
    setShowModal(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon_url: category.icon_url || '',
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setIconFile(null);
    setIconPreview(category.icon_url);
    setShowModal(true);
  }

  function handleNameChange(name: string) {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: !editingCategory || prev.slug === slugify(prev.name) ? slugify(name) : prev.slug,
    }));
  }

  function handleIconSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('El icono debe ser menor a 2MB');
      return;
    }

    setIconFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function uploadIcon(): Promise<string | null> {
    if (!iconFile) return formData.icon_url || null;

    setUploadingIcon(true);
    try {
      const ext = iconFile.name.split('.').pop() || 'png';
      const fileName = `${formData.slug || slugify(formData.name)}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('category-icons')
        .upload(fileName, iconFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('category-icons')
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    } catch (error: any) {
      console.error('Error uploading icon:', error);
      alert('Error al subir el icono: ' + error.message);
      return null;
    } finally {
      setUploadingIcon(false);
    }
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    try {
      let iconUrl = formData.icon_url;
      if (iconFile) {
        const uploaded = await uploadIcon();
        if (uploaded) iconUrl = uploaded;
      }

      const payload: any = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || slugify(formData.name),
        description: formData.description.trim() || null,
        icon_url: iconUrl || null,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
      }

      await loadCategories();
      setShowModal(false);
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert('Error al guardar categoria: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(category: Category) {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);
      if (error) throw error;
      await loadCategories();
    } catch (error: any) {
      alert('Error al cambiar estado: ' + error.message);
    }
  }

  async function handleDelete() {
    if (!categoryToDelete) return;

    setSaving(true);
    try {
      await supabase.from('category_tags').delete().eq('category_id', categoryToDelete.id);
      await supabase.from('category_keywords').delete().eq('category_id', categoryToDelete.id);
      await supabase.from('specialist_categories').delete().eq('category_id', categoryToDelete.id);

      const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id);
      if (error) throw error;

      await loadCategories();
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    } catch (error: any) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar categoria: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  // Kanban helpers
  const kanbanActivos = filteredCategories.filter((c) => c.is_active);
  const kanbanPorActivar = filteredCategories.filter(
    (c) => !c.is_active && (c.description || c.icon_url)
  );
  const kanbanDesactivados = filteredCategories.filter(
    (c) => !c.is_active && !c.description && !c.icon_url
  );

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
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '20px', fontWeight: 'bold', color: '#36004E', margin: 0 }}>
            Gestion de Categorias
          </h2>
          <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>
            {categories.length} categorias registradas ({categories.filter((c) => c.is_active).length} activas)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('table')}
              title="Vista de tabla"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                backgroundColor: viewMode === 'table' ? '#36004E' : 'white',
                color: viewMode === 'table' ? 'white' : '#6B7280',
                transition: 'all 0.2s',
              }}
            >
              <Table style={{ width: '16px', height: '16px' }} />
              Tabla
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Vista Kanban"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                backgroundColor: viewMode === 'kanban' ? '#36004E' : 'white',
                color: viewMode === 'kanban' ? 'white' : '#6B7280',
                transition: 'all 0.2s',
              }}
            >
              <Columns style={{ width: '16px', height: '16px' }} />
              Kanban
            </button>
          </div>

          <button
            onClick={openCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: '#36004E',
              color: 'white',
              fontWeight: 500,
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Centrale Sans Rounded', sans-serif",
            }}
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Nueva Categoria
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar categorias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 48px',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: "'Centrale Sans Rounded', sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{
            padding: '12px 16px',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: "'Centrale Sans Rounded', sans-serif",
            outline: 'none',
            cursor: 'pointer',
            backgroundColor: 'white',
          }}
        >
          <option value="all">Todas</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <>
          {filteredCategories.length > 0 ? (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Imagen
                      </th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Nombre
                      </th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Descripcion
                      </th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Especialistas
                      </th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category, idx) => (
                      <tr
                        key={category.id}
                        style={{
                          borderBottom: idx < filteredCategories.length - 1 ? '1px solid #F3F4F6' : 'none',
                          opacity: category.is_active ? 1 : 0.6,
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFA')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Imagen */}
                        <td style={{ padding: '12px 16px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(170,27,241,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {category.icon_url ? (
                              <img
                                src={category.icon_url}
                                alt={category.name}
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '10px' }}
                              />
                            ) : (
                              <FolderTree style={{ width: '20px', height: '20px', color: '#AA1BF1' }} />
                            )}
                          </div>
                        </td>
                        {/* Nombre */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontWeight: 'bold', color: '#36004E', fontSize: '15px' }}>
                            {category.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{category.slug}</div>
                        </td>
                        {/* Descripcion */}
                        <td style={{ padding: '12px 16px', maxWidth: '280px' }}>
                          <span style={{ fontSize: '13px', color: '#6B7280', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {category.description || <span style={{ color: '#D1D5DB', fontStyle: 'italic' }}>Sin descripcion</span>}
                          </span>
                        </td>
                        {/* Especialistas */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4B5563', fontSize: '14px' }}>
                            <Users style={{ width: '14px', height: '14px' }} />
                            <span>{category.specialistCount}</span>
                          </div>
                        </td>
                        {/* Acciones */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button
                              onClick={() => openEditModal(category)}
                              title="Editar"
                              style={{
                                padding: '7px',
                                color: '#6B7280',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'color 0.15s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#AA1BF1')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
                            >
                              <Edit2 style={{ width: '16px', height: '16px' }} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(category)}
                              title={category.is_active ? 'Desactivar' : 'Activar'}
                              style={{
                                padding: '7px',
                                color: category.is_active ? '#10B981' : '#9CA3AF',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              {category.is_active ? (
                                <Eye style={{ width: '16px', height: '16px' }} />
                              ) : (
                                <EyeOff style={{ width: '16px', height: '16px' }} />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setCategoryToDelete(category);
                                setShowDeleteConfirm(true);
                              }}
                              title="Eliminar"
                              style={{
                                padding: '7px',
                                color: '#D1D5DB',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'color 0.15s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#D1D5DB')}
                            >
                              <Trash2 style={{ width: '16px', height: '16px' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F3F4F6' }}>
              <FolderTree style={{ width: '48px', height: '48px', color: '#D1D5DB', margin: '0 auto 16px' }} />
              <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", color: '#6B7280' }}>No se encontraron categorias</p>
            </div>
          )}
        </>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'flex-start' }}>
          {/* Activos Column */}
          <KanbanColumn
            title="Activos"
            count={kanbanActivos.length}
            headerColor="#DCFCE7"
            headerTextColor="#166534"
            items={kanbanActivos}
            onCardClick={openEditModal}
          />
          {/* Por activar Column */}
          <KanbanColumn
            title="Por activar"
            count={kanbanPorActivar.length}
            headerColor="#FEF3C7"
            headerTextColor="#92400E"
            items={kanbanPorActivar}
            onCardClick={openEditModal}
          />
          {/* Desactivados Column */}
          <KanbanColumn
            title="Desactivados"
            count={kanbanDesactivados.length}
            headerColor="#F3F4F6"
            headerTextColor="#4B5563"
            items={kanbanDesactivados}
            onCardClick={openEditModal}
          />
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '18px', fontWeight: 'bold', color: '#36004E', margin: 0 }}>
                {editingCategory ? 'Editar Categoria' : 'Nueva Categoria'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Icon Upload */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                Icono de la Categoria
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '12px',
                    backgroundColor: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed #D1D5DB',
                    overflow: 'hidden',
                  }}
                >
                  {iconPreview ? (
                    <img src={iconPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Upload style={{ width: '24px', height: '24px', color: '#9CA3AF' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                    }}
                  >
                    Seleccionar imagen
                  </button>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                    PNG, JPG, SVG (max 2MB)
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                Nombre *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', fontFamily: "'Centrale Sans Rounded', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                placeholder="ej: Plomeria"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                Slug (identificador) *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', fontFamily: "'Centrale Sans Rounded', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                placeholder="ej: plomeria"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                Descripcion
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', fontFamily: "'Centrale Sans Rounded', sans-serif", outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                placeholder="Descripcion breve de la categoria"
              />
            </div>

            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Categoria activa (visible en la app)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '12px 16px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: 500, borderRadius: '12px', cursor: 'pointer', fontFamily: "'Centrale Sans Rounded', sans-serif" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || saving || uploadingIcon}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  backgroundColor: '#36004E',
                  color: 'white',
                  fontWeight: 500,
                  borderRadius: '12px',
                  cursor: !formData.name.trim() || saving || uploadingIcon ? 'not-allowed' : 'pointer',
                  opacity: !formData.name.trim() || saving || uploadingIcon ? 0.5 : 1,
                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {saving || uploadingIcon ? (
                  uploadingIcon ? 'Subiendo...' : 'Guardando...'
                ) : (
                  <>
                    <Save style={{ width: '20px', height: '20px' }} />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && categoryToDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '12px' }}>
                <AlertTriangle style={{ width: '24px', height: '24px', color: '#DC2626' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '18px', fontWeight: 'bold', color: '#36004E', margin: 0 }}>
                  Eliminar Categoria
                </h3>
                <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>Esta accion no se puede deshacer</p>
              </div>
            </div>

            <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", color: '#4B5563', marginBottom: '24px' }}>
              Estas seguro de que deseas eliminar la categoria <strong>{categoryToDelete.name}</strong>?
              {categoryToDelete.specialistCount && categoryToDelete.specialistCount > 0 ? (
                <span style={{ display: 'block', marginTop: '8px', color: '#DC2626' }}>
                  Hay {categoryToDelete.specialistCount} especialistas usando esta categoria. Se desvincularan.
                </span>
              ) : null}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCategoryToDelete(null);
                }}
                style={{ flex: 1, padding: '12px 16px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: 500, borderRadius: '12px', cursor: 'pointer', fontFamily: "'Centrale Sans Rounded', sans-serif" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{ flex: 1, padding: '12px 16px', border: 'none', backgroundColor: '#DC2626', color: 'white', fontWeight: 500, borderRadius: '12px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: "'Centrale Sans Rounded', sans-serif" }}
              >
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kanban Column Component                                           */
/* ------------------------------------------------------------------ */
function KanbanColumn({
  title,
  count,
  headerColor,
  headerTextColor,
  items,
  onCardClick,
}: {
  title: string;
  count: number;
  headerColor: string;
  headerTextColor: string;
  items: Category[];
  onCardClick: (cat: Category) => void;
}) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        minHeight: '200px',
      }}
    >
      {/* Column header */}
      <div
        style={{
          backgroundColor: headerColor,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: "'Isidora Alt Bold', sans-serif",
            fontWeight: 'bold',
            fontSize: '15px',
            color: headerTextColor,
          }}
        >
          {title}
        </span>
        <span
          style={{
            backgroundColor: headerTextColor,
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            padding: '2px 10px',
            borderRadius: '9999px',
            fontFamily: "'Centrale Sans Rounded', sans-serif",
          }}
        >
          {count}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.length === 0 && (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: '#D1D5DB',
              fontSize: '13px',
              fontFamily: "'Centrale Sans Rounded', sans-serif",
            }}
          >
            Sin categorias
          </div>
        )}
        {items.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onCardClick(cat)}
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #F3F4F6',
              backgroundColor: '#FAFAFA',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'box-shadow 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(170,27,241,0.12)';
              e.currentTarget.style.borderColor = '#E0C4F4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#F3F4F6';
            }}
          >
            {/* Drag handle (visual only) */}
            <GripVertical style={{ width: '14px', height: '14px', color: '#D1D5DB', flexShrink: 0 }} />

            {/* Icon thumbnail */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(170,27,241,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {cat.icon_url ? (
                <img src={cat.icon_url} alt={cat.name} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '8px' }} />
              ) : (
                <FolderTree style={{ width: '18px', height: '18px', color: '#AA1BF1' }} />
              )}
            </div>

            {/* Name + specialist count */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Isidora Alt Bold', sans-serif",
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#36004E',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {cat.name}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#9CA3AF',
                  marginTop: '2px',
                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                }}
              >
                <Users style={{ width: '12px', height: '12px' }} />
                <span>{cat.specialistCount} especialistas</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
