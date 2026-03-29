import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAdminMenuManager } from '../../../features/admin/hooks/useAdminMenuManager';
import { confirmInBrowser } from '../../../services/browser/dialogService';

const CURRENCY_SYMBOL = '\u20B9';

export default function AdminMenuManager() {
  const {
    menuItems,
    menuForm,
    editingId,
    isSaving,
    managerError,
    isEditorOpen,
    openCreate,
    closeEditor,
    editMenuItem,
    updateMenuForm,
    saveMenuItem,
    deleteMenuItem,
    toggleAvailability,
  } = useAdminMenuManager();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Menu editor</p>
          <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">Products</h2>
        </div>
        <button onClick={openCreate} className="coffee-btn-primary">
          <Plus size={16} />
          Add
        </button>
      </div>

      {isEditorOpen && (
        <div className="coffee-surface-soft rounded-[24px] p-4">
          <h3 className="text-base font-semibold text-accent">{editingId ? 'Edit product' : 'New product'}</h3>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={menuForm.name}
              onChange={event => updateMenuForm(prev => ({ ...prev, name: event.target.value }))}
              placeholder="Product name"
              className="coffee-input"
            />
            <input
              type="text"
              value={menuForm.category}
              onChange={event => updateMenuForm(prev => ({ ...prev, category: event.target.value }))}
              placeholder="Category"
              className="coffee-input"
            />
            <input
              type="number"
              min="1"
              value={menuForm.price}
              onChange={event => updateMenuForm(prev => ({ ...prev, price: event.target.value }))}
              placeholder="Price"
              className="coffee-input"
            />
            <input
              type="number"
              min="0"
              max="5"
              value={menuForm.spiceLevel}
              onChange={event => updateMenuForm(prev => ({ ...prev, spiceLevel: event.target.value }))}
              placeholder="Spice level"
              className="coffee-input"
            />
            <input
              type="url"
              value={menuForm.image}
              onChange={event => updateMenuForm(prev => ({ ...prev, image: event.target.value }))}
              placeholder="Image URL"
              className="coffee-input sm:col-span-2"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={menuForm.veg}
              onChange={event => updateMenuForm(prev => ({ ...prev, veg: event.target.checked }))}
            />
            Vegetarian
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => void saveMenuItem()} disabled={isSaving} className="coffee-btn-primary disabled:opacity-60">
              {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button onClick={closeEditor} className="coffee-btn-secondary">
              Cancel
            </button>
            {editingId && (
              <button
                onClick={() => {
                  if (!confirmInBrowser('Delete this product permanently?')) {
                    return;
                  }

                  void deleteMenuItem(editingId);
                }}
                className="coffee-btn-secondary border-red-400/20 bg-red-500/10 text-red-300"
              >
                <Trash2 size={15} />
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {managerError && (
        <div className="rounded-[22px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {managerError}
        </div>
      )}

      <div className="space-y-3">
        {menuItems.map(item => (
          <article
            key={item.id}
            className="coffee-surface-soft flex items-center justify-between gap-3 rounded-[24px] p-4"
          >
            <button onClick={() => editMenuItem(item)} className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-accent">{item.name}</p>
                <span className="coffee-badge">{item.category}</span>
              </div>
              <p className="mt-2 text-sm text-ink-muted">{CURRENCY_SYMBOL}{item.price}</p>
            </button>

            <div className="flex items-center gap-2">
              <button onClick={() => editMenuItem(item)} className="coffee-icon-btn">
                <Pencil size={16} />
              </button>
              <button
                onClick={() => void toggleAvailability(item.id, item.is_available)}
                className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  item.is_available
                    ? 'border border-emerald-300/20 bg-emerald-500/10 text-emerald-300'
                    : 'border border-white/10 bg-white/6 text-ink-muted'
                }`}
              >
                {item.is_available ? 'Live' : 'Off'}
              </button>
            </div>
          </article>
        ))}

        {menuItems.length === 0 && (
          <div className="coffee-surface-soft rounded-[24px] p-5 text-sm text-ink-muted">
            No products found.
          </div>
        )}
      </div>
    </section>
  );
}
