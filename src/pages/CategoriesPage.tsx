import { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  Tag,
  Users,
  X,
  Save,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  id: number;
  category_key: string;
  category_name: string;
  created_at: string | null;
  specialistCount?: number;
  tags?: CategoryTag[];
}

interface CategoryTag {
  id: number;
  tag_key: string;
  tag_name: string;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ category_key: '', category_name: '' });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      console.log('Loading categories...');
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('category_name');

      console.log('Categories result:', { data: categoriesData, error: categoriesError });

      if (categoriesError) throw categoriesError;

      const { data: specialistCounts } = await supabase
        .from('specialist_categories')
        .select('category_id');

      const { data: tagsData } = await supabase
        .from('category_tags')
        .select('*');

      const countsMap = new Map<number, number>();
      specialistCounts?.forEach(sc => {
        countsMap.set(sc.category_id, (countsMap.get(sc.category_id) || 0) + 1);
      });

      const tagsMap = new Map<number, CategoryTag[]>();
      tagsData?.forEach(tag => {
        const existing = tagsMap.get(tag.category_id) || [];
        existing.push({ id: tag.id, tag_key: tag.tag_key, tag_name: tag.tag_name });
        tagsMap.set(tag.category_id, existing);
      });

      const categoriesWithData = (categoriesData || []).map(cat => ({
        ...cat,
        specialistCount: countsMap.get(cat.id) || 0,
        tags: tagsMap.get(cat.id) || [],
      }));

      setCategories(categoriesWithData);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCategories = categories.filter(category =>
    category.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.category_key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function openCreateModal() {
    setEditingCategory(null);
    setFormData({ category_key: '', category_name: '' });
    setShowModal(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setFormData({
      category_key: category.category_key,
      category_name: category.category_name,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.category_key.trim() || !formData.category_name.trim()) return;

    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            category_key: formData.category_key,
            category_name: formData.category_name,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const maxId = Math.max(...categories.map(c => c.id), 0) + 1;

        const { error } = await supabase
          .from('categories')
          .insert({
            id: maxId,
            category_key: formData.category_key,
            category_name: formData.category_name,
          });

        if (error) throw error;
      }

      await loadCategories();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!categoryToDelete) return;

    setSaving(true);
    try {
      await supabase
        .from('category_tags')
        .delete()
        .eq('category_id', categoryToDelete.id);

      await supabase
        .from('category_keywords')
        .delete()
        .eq('category_id', categoryToDelete.id);

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;

      await loadCategories();
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setSaving(false);
    }
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
            animation: 'spin 1s linear infinite'
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
            {categories.length} categorias registradas
          </p>
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
            fontFamily: "'Centrale Sans Rounded', sans-serif"
          }}
        >
          <Plus style={{ width: '20px', height: '20px' }} />
          Nueva Categoria
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
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
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Categories Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #F3F4F6'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(170,27,241,0.1)', borderRadius: '12px' }}>
                <FolderTree style={{ width: '24px', height: '24px', color: '#AA1BF1' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => openEditModal(category)}
                  style={{ padding: '8px', color: '#9CA3AF', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <Edit2 style={{ width: '16px', height: '16px' }} />
                </button>
                <button
                  onClick={() => { setCategoryToDelete(category); setShowDeleteConfirm(true); }}
                  style={{ padding: '8px', color: '#9CA3AF', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            </div>

            <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontWeight: 'bold', color: '#36004E', fontSize: '18px', margin: '0 0 4px 0' }}>
              {category.category_name}
            </h3>
            <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", fontSize: '14px', color: '#6B7280', margin: '0 0 16px 0' }}>
              {category.category_key}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4B5563', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                <Users style={{ width: '16px', height: '16px' }} />
                <span>{category.specialistCount} especialistas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4B5563', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                <Tag style={{ width: '16px', height: '16px' }} />
                <span>{category.tags?.length || 0} tags</span>
              </div>
            </div>

            {/* Tags */}
            {category.tags && category.tags.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {category.tags.slice(0, 5).map((tag) => (
                  <span key={tag.id} style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '9999px', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                    {tag.tag_name}
                  </span>
                ))}
                {category.tags.length > 5 && (
                  <span style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '9999px', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                    +{category.tags.length - 5} mas
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F3F4F6' }}>
          <FolderTree style={{ width: '48px', height: '48px', color: '#D1D5DB', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Centrale Sans Rounded', sans-serif", color: '#6B7280' }}>No se encontraron categorias</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: "'Isidora Alt Bold', sans-serif", fontSize: '18px', fontWeight: 'bold', color: '#36004E', margin: 0 }}>
                {editingCategory ? 'Editar Categoria' : 'Nueva Categoria'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                Clave de Categoria
              </label>
              <input
                type="text"
                value={formData.category_key}
                onChange={(e) => setFormData({ ...formData, category_key: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', fontFamily: "'Centrale Sans Rounded', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                placeholder="ej: plumbing"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                Nombre de Categoria
              </label>
              <input
                type="text"
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', fontFamily: "'Centrale Sans Rounded', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                placeholder="ej: Plomeria"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px 16px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: 500, borderRadius: '12px', cursor: 'pointer', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.category_key.trim() || !formData.category_name.trim() || saving}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  backgroundColor: '#36004E',
                  color: 'white',
                  fontWeight: 500,
                  borderRadius: '12px',
                  cursor: (!formData.category_key.trim() || !formData.category_name.trim() || saving) ? 'not-allowed' : 'pointer',
                  opacity: (!formData.category_key.trim() || !formData.category_name.trim() || saving) ? 0.5 : 1,
                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {saving ? 'Guardando...' : (
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
              Estas seguro de que deseas eliminar la categoria <strong>{categoryToDelete.category_name}</strong>?
              {categoryToDelete.specialistCount && categoryToDelete.specialistCount > 0 && (
                <span style={{ display: 'block', marginTop: '8px', color: '#DC2626' }}>
                  Hay {categoryToDelete.specialistCount} especialistas usando esta categoria.
                </span>
              )}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowDeleteConfirm(false); setCategoryToDelete(null); }} style={{ flex: 1, padding: '12px 16px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: 500, borderRadius: '12px', cursor: 'pointer', fontFamily: "'Centrale Sans Rounded', sans-serif" }}>
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
