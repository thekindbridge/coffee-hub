import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  spiceLevel: number;
  veg: boolean;
  isAvailable: boolean;
}

interface MenuFormState {
  name: string;
  category: string;
  price: string;
  image: string;
  spiceLevel: string;
  veg: boolean;
}

const initialFormState: MenuFormState = {
  name: '',
  category: '',
  price: '',
  image: '',
  spiceLevel: '0',
  veg: true,
};

const CURRENCY_SYMBOL = '\u20B9';

export default function AdminMenuManager() {
  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
  const [menuForm, setMenuForm] = useState<MenuFormState>(initialFormState);
  const [editingId, setEditingId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [managerError, setManagerError] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    const menuQuery = query(collection(db, 'menu_items'), orderBy('name'));
    const unsubscribe = onSnapshot(
      menuQuery,
      snapshot => {
        const nextMenu = snapshot.docs.map(menuDoc => {
          const data = menuDoc.data() as Record<string, unknown>;
          return {
            id: menuDoc.id,
            name: (data.name as string) || '',
            category: (data.category as string) || '',
            price: Number(data.price || 0),
            image: (data.image as string) || '',
            spiceLevel: Number(data.spiceLevel || 0),
            veg: data.veg !== false,
            isAvailable: data.isAvailable !== false,
          } satisfies AdminMenuItem;
        });

        setMenuItems(nextMenu);
      },
      error => {
        console.error('Failed to load menu items for admin manager', error);
        setManagerError('Unable to load menu items right now.');
      },
    );

    return unsubscribe;
  }, []);

  const isFormValid = useMemo(() => {
    const priceNumber = Number(menuForm.price);
    const spiceLevelNumber = Number(menuForm.spiceLevel);

    return (
      menuForm.name.trim().length > 0 &&
      menuForm.category.trim().length > 0 &&
      Number.isFinite(priceNumber) &&
      priceNumber > 0 &&
      Number.isFinite(spiceLevelNumber) &&
      spiceLevelNumber >= 0 &&
      spiceLevelNumber <= 5
    );
  }, [menuForm]);

  const resetForm = () => {
    setMenuForm(initialFormState);
    setEditingId('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const handleEdit = (item: AdminMenuItem) => {
    setEditingId(item.id);
    setMenuForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      image: item.image,
      spiceLevel: String(item.spiceLevel),
      veg: item.veg,
    });
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!isFormValid) {
      setManagerError('Please complete all fields with valid values.');
      return;
    }

    setIsSaving(true);
    setManagerError('');

    const payload = {
      name: menuForm.name.trim(),
      category: menuForm.category.trim(),
      price: Number(menuForm.price),
      image: menuForm.image.trim(),
      spiceLevel: Number(menuForm.spiceLevel),
      veg: menuForm.veg,
    };

    try {
      if (editingId) {
        const existingItem = menuItems.find(item => item.id === editingId);
        await updateDoc(doc(db, 'menu_items', editingId), {
          ...payload,
          isAvailable: existingItem?.isAvailable ?? true,
        });
      } else {
        await addDoc(collection(db, 'menu_items'), {
          ...payload,
          isAvailable: true,
        });
      }

      setIsEditorOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save menu item', error);
      setManagerError('Unable to save menu item right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const shouldDelete = window.confirm('Delete this product permanently?');
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'menu_items', id));
      setIsEditorOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to delete menu item', error);
      setManagerError('Unable to delete product right now.');
    }
  };

  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    try {
      await updateDoc(doc(db, 'menu_items', id), { isAvailable: !isAvailable });
    } catch (error) {
      console.error('Failed to update menu item availability', error);
      setManagerError('Unable to update item availability right now.');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">Products</h2>
        <button
          onClick={handleOpenCreate}
          className="min-h-12 rounded-2xl bg-primary px-5 text-sm font-black text-white"
        >
          Add Product
        </button>
      </div>

      {isEditorOpen && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-lg font-black">{editingId ? 'Edit Product' : 'New Product'}</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={menuForm.name}
              onChange={event => setMenuForm(prev => ({ ...prev, name: event.target.value }))}
              placeholder="Product name"
              className="min-h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              value={menuForm.category}
              onChange={event => setMenuForm(prev => ({ ...prev, category: event.target.value }))}
              placeholder="Category"
              className="min-h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              min="1"
              value={menuForm.price}
              onChange={event => setMenuForm(prev => ({ ...prev, price: event.target.value }))}
              placeholder="Price"
              className="min-h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              min="0"
              max="5"
              value={menuForm.spiceLevel}
              onChange={event => setMenuForm(prev => ({ ...prev, spiceLevel: event.target.value }))}
              placeholder="Spice level"
              className="min-h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="url"
              value={menuForm.image}
              onChange={event => setMenuForm(prev => ({ ...prev, image: event.target.value }))}
              placeholder="Image URL"
              className="min-h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm focus:border-primary focus:outline-none sm:col-span-2"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={menuForm.veg}
              onChange={event => setMenuForm(prev => ({ ...prev, veg: event.target.checked }))}
            />
            Vegetarian
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="min-h-12 rounded-2xl bg-primary px-5 text-sm font-black text-white disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
            </button>
            <button
              onClick={() => {
                setIsEditorOpen(false);
                resetForm();
              }}
              className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-ink-muted"
            >
              Cancel
            </button>
            {editingId && (
              <button
                onClick={() => void handleDeleteItem(editingId)}
                className="min-h-12 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 text-sm font-bold text-red-300"
              >
                Delete Product
              </button>
            )}
          </div>
        </div>
      )}

      {managerError && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {managerError}
        </div>
      )}

      <div className="space-y-3">
        {menuItems.map(item => (
          <article
            key={item.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => handleEdit(item)}
                className="text-left"
              >
                <p className="text-lg font-black">{item.name}</p>
                <p className="text-sm text-ink-muted">{CURRENCY_SYMBOL}{item.price}</p>
              </button>

              <button
                onClick={() => void handleToggleAvailability(item.id, item.isAvailable)}
                className={`min-h-12 min-w-20 rounded-2xl px-4 text-sm font-black ${
                  item.isAvailable
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 text-ink-muted'
                }`}
              >
                {item.isAvailable ? 'ON' : 'OFF'}
              </button>
            </div>
          </article>
        ))}

        {menuItems.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-ink-muted">
            No products found.
          </div>
        )}
      </div>
    </section>
  );
}
