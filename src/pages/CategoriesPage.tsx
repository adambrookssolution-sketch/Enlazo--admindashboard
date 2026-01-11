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
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('category_name');

      if (categoriesError) throw categoriesError;

      // Fetch specialist counts per category
      const { data: specialistCounts } = await supabase
        .from('specialist_categories')
        .select('category_id');

      // Fetch tags per category
      const { data: tagsData } = await supabase
        .from('category_tags')
        .select('*');

      // Create counts map
      const countsMap = new Map<number, number>();
      specialistCounts?.forEach(sc => {
        countsMap.set(sc.category_id, (countsMap.get(sc.category_id) || 0) + 1);
      });

      // Create tags map
      const tagsMap = new Map<number, CategoryTag[]>();
      tagsData?.forEach(tag => {
        const existing = tagsMap.get(tag.category_id) || [];
        existing.push({ id: tag.id, tag_key: tag.tag_key, tag_name: tag.tag_name });
        tagsMap.set(tag.category_id, existing);
      });

      // Combine data
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
        // Update
        const { error } = await supabase
          .from('categories')
          .update({
            category_key: formData.category_key,
            category_name: formData.category_name,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        // Get max ID for new category
        const maxId = Math.max(...categories.map(c => c.id), 0) + 1;

        // Create
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
      // Delete tags first
      await supabase
        .from('category_tags')
        .delete()
        .eq('category_id', categoryToDelete.id);

      // Delete keywords
      await supabase
        .from('category_keywords')
        .delete()
        .eq('category_id', categoryToDelete.id);

      // Delete category
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
            Gestion de Categorias
          </h2>
          <p className="text-gray-500 text-sm">
            {categories.length} categorias registradas
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-3 bg-conexion-profunda text-white font-medium rounded-xl hover:bg-conexion-profunda/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Categoria
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar categorias..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morado-confianza focus:border-morado-confianza"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-morado-confianza/10 rounded-xl">
                <FolderTree className="w-6 h-6 text-morado-confianza" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(category)}
                  className="p-2 text-gray-400 hover:text-morado-confianza hover:bg-morado-confianza/10 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCategoryToDelete(category);
                    setShowDeleteConfirm(true);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-conexion-profunda text-lg mb-1">
              {category.category_name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {category.category_key}
            </p>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="w-4 h-4" />
                <span>{category.specialistCount} especialistas</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Tag className="w-4 h-4" />
                <span>{category.tags?.length || 0} tags</span>
              </div>
            </div>

            {/* Tags */}
            {category.tags && category.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {category.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                  >
                    {tag.tag_name}
                  </span>
                ))}
                {category.tags.length > 5 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    +{category.tags.length - 5} mas
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron categorias</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-conexion-profunda">
                {editingCategory ? 'Editar Categoria' : 'Nueva Categoria'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clave de Categoria
                </label>
                <input
                  type="text"
                  value={formData.category_key}
                  onChange={(e) => setFormData({ ...formData, category_key: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morado-confianza focus:border-morado-confianza"
                  placeholder="ej: plumbing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de Categoria
                </label>
                <input
                  type="text"
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morado-confianza focus:border-morado-confianza"
                  placeholder="ej: Plomeria"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.category_key.trim() || !formData.category_name.trim() || saving}
                className="flex-1 px-4 py-3 bg-conexion-profunda text-white font-medium rounded-xl hover:bg-conexion-profunda/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-conexion-profunda">
                  Eliminar Categoria
                </h3>
                <p className="text-gray-500 text-sm">Esta accion no se puede deshacer</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Estas seguro de que deseas eliminar la categoria <strong>{categoryToDelete.category_name}</strong>?
              {categoryToDelete.specialistCount && categoryToDelete.specialistCount > 0 && (
                <span className="block mt-2 text-red-600">
                  Hay {categoryToDelete.specialistCount} especialistas usando esta categoria.
                </span>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCategoryToDelete(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
