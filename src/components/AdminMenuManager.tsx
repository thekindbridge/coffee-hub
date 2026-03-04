import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
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

export default function AdminMenuManager() {
  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
  const [menuForm, setMenuForm] = useState<MenuFormState>(initialFormState);
  const [editingId, setEditingId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [managerError, setManagerError] = useState('');

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

      resetForm();
    } catch (error) {
      console.error('Failed to save menu item', error);
      setManagerError('Unable to save menu item right now.');
    } finally {
      setIsSaving(false);
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
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-xl font-black">{editingId ? 'Edit Item' : 'Add Item'}</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            value={menuForm.name}
            onChange={e => setMenuForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Item name"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={menuForm.category}
            onChange={e => setMenuForm(prev => ({ ...prev, category: e.target.value }))}
            placeholder="Category"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="number"
            min="1"
            value={menuForm.price}
            onChange={e => setMenuForm(prev => ({ ...prev, price: e.target.value }))}
            placeholder="Price"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="number"
            min="0"
            max="5"
            value={menuForm.spiceLevel}
            onChange={e => setMenuForm(prev => ({ ...prev, spiceLevel: e.target.value }))}
            placeholder="Spice level (0-5)"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="url"
            value={menuForm.image}
            onChange={e => setMenuForm(prev => ({ ...prev, image: e.target.value }))}
            placeholder="Image URL"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none md:col-span-2"
          />
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={menuForm.veg}
            onChange={e => setMenuForm(prev => ({ ...prev, veg: e.target.checked }))}
          />
          Vegetarian item
        </label>

        {managerError && <p className="mt-3 text-sm text-primary">{managerError}</p>}

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {isSaving ? 'SAVING...' : editingId ? 'UPDATE ITEM' : 'ADD ITEM'}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-ink-muted"
            >
              CANCEL EDIT
            </button>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-xl font-black">Menu Items</h3>
        <div className="space-y-3">
          {menuItems.map(item => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-xs text-ink-muted">
                  {item.category} • ₹{item.price} • Spice {item.spiceLevel}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold"
                >
                  EDIT
                </button>
                <button
                  onClick={() => void handleToggleAvailability(item.id, item.isAvailable)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold ${
                    item.isAvailable ? 'bg-primary text-white' : 'bg-white/10 text-ink-muted'
                  }`}
                >
                  {item.isAvailable ? 'DISABLE' : 'ENABLE'}
                </button>
              </div>
            </div>
          ))}
          {menuItems.length === 0 && (
            <p className="text-sm text-ink-muted">No menu items found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
