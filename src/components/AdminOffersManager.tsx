import { useMemo, useState } from 'react';
import type { Offer, OfferInput } from '../types';

interface OfferFormState {
  title: string;
  description: string;
  couponCode: string;
  discountType: Offer['discountType'];
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  isActive: boolean;
}

const initialOfferForm: OfferFormState = {
  title: '',
  description: '',
  couponCode: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  isActive: true,
};

interface AdminOffersManagerProps {
  offers: Offer[];
  isLoading: boolean;
  managerError: string;
  onCreateOffer: (offerInput: OfferInput) => Promise<void>;
  onUpdateOffer: (offerId: string, offerInput: OfferInput) => Promise<void>;
  onDeleteOffer: (offerId: string) => Promise<void>;
  onToggleOfferStatus: (offerId: string, isActive: boolean) => Promise<void>;
}

const toUppercaseCouponCode = (value: string) => value.trim().toUpperCase();

export default function AdminOffersManager({
  offers,
  isLoading,
  managerError,
  onCreateOffer,
  onUpdateOffer,
  onDeleteOffer,
  onToggleOfferStatus,
}: AdminOffersManagerProps) {
  const [offerForm, setOfferForm] = useState<OfferFormState>(initialOfferForm);
  const [editingOfferId, setEditingOfferId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const sortedOffers = useMemo(
    () => [...offers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [offers],
  );

  const resetForm = () => {
    setOfferForm(initialOfferForm);
    setEditingOfferId('');
    setLocalError('');
  };

  const handleEdit = (offer: Offer) => {
    setEditingOfferId(offer.id);
    setOfferForm({
      title: offer.title,
      description: offer.description,
      couponCode: offer.couponCode,
      discountType: offer.discountType,
      discountValue: String(offer.discountValue),
      minOrderAmount: String(offer.minOrderAmount),
      maxDiscountAmount: typeof offer.maxDiscountAmount === 'number' ? String(offer.maxDiscountAmount) : '',
      isActive: offer.isActive,
    });
    setLocalError('');
  };

  const validateAndBuildPayload = (): OfferInput | null => {
    const title = offerForm.title.trim();
    const description = offerForm.description.trim();
    const couponCode = toUppercaseCouponCode(offerForm.couponCode);
    const discountValue = Number(offerForm.discountValue);
    const minOrderAmount = Number(offerForm.minOrderAmount || 0);
    const maxDiscountAmountRaw = offerForm.maxDiscountAmount.trim();
    const maxDiscountAmount = maxDiscountAmountRaw ? Number(maxDiscountAmountRaw) : undefined;

    if (!title || !description || !couponCode) {
      setLocalError('Title, description, and coupon code are required.');
      return null;
    }

    if (!/^[A-Z0-9_-]+$/.test(couponCode)) {
      setLocalError('Coupon code can use uppercase letters, numbers, "_" and "-".');
      return null;
    }

    const duplicateOffer = offers.find(
      existingOffer => existingOffer.couponCode === couponCode && existingOffer.id !== editingOfferId,
    );
    if (duplicateOffer) {
      setLocalError('Coupon code must be unique.');
      return null;
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setLocalError('Discount value must be greater than 0.');
      return null;
    }

    if (offerForm.discountType === 'percentage' && discountValue > 100) {
      setLocalError('Percentage discount cannot exceed 100.');
      return null;
    }

    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      setLocalError('Minimum order amount cannot be negative.');
      return null;
    }

    if (typeof maxDiscountAmount === 'number') {
      if (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0) {
        setLocalError('Max discount cannot be negative.');
        return null;
      }
    }

    if (offerForm.discountType === 'flat' && minOrderAmount > 0 && discountValue > minOrderAmount) {
      setLocalError('Flat discount should not exceed minimum order amount.');
      return null;
    }

    return {
      title,
      description,
      couponCode,
      discountType: offerForm.discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      isActive: offerForm.isActive,
    };
  };

  const handleSave = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) {
      return;
    }

    setIsSaving(true);
    setLocalError('');

    try {
      if (editingOfferId) {
        await onUpdateOffer(editingOfferId, payload);
      } else {
        await onCreateOffer(payload);
      }

      resetForm();
    } catch (error) {
      console.error('Failed to save offer', error);
      setLocalError(error instanceof Error ? error.message : 'Unable to save offer right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (offerId: string) => {
    const shouldDelete = window.confirm('Delete this offer permanently?');
    if (!shouldDelete) {
      return;
    }

    try {
      await onDeleteOffer(offerId);
      if (editingOfferId === offerId) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to delete offer', error);
      setLocalError('Unable to delete offer right now.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-xl font-black">{editingOfferId ? 'Edit Offer' : 'Create Offer'}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            value={offerForm.title}
            onChange={e => setOfferForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Title"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={offerForm.couponCode}
            onChange={e => setOfferForm(prev => ({ ...prev, couponCode: toUppercaseCouponCode(e.target.value) }))}
            placeholder="Coupon Code"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm uppercase focus:border-primary focus:outline-none"
          />
          <textarea
            value={offerForm.description}
            onChange={e => setOfferForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none md:col-span-2"
          />
          <select
            value={offerForm.discountType}
            onChange={e => setOfferForm(prev => ({ ...prev, discountType: e.target.value as Offer['discountType'] }))}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="percentage">Percentage</option>
            <option value="flat">Flat</option>
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            value={offerForm.discountValue}
            onChange={e => setOfferForm(prev => ({ ...prev, discountValue: e.target.value }))}
            placeholder="Discount Value"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={offerForm.minOrderAmount}
            onChange={e => setOfferForm(prev => ({ ...prev, minOrderAmount: e.target.value }))}
            placeholder="Minimum Order Amount"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={offerForm.maxDiscountAmount}
            onChange={e => setOfferForm(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
            placeholder="Max Discount (optional)"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={offerForm.isActive}
            onChange={e => setOfferForm(prev => ({ ...prev, isActive: e.target.checked }))}
          />
          Offer active
        </label>

        {(localError || managerError) && (
          <p className="mt-3 text-sm text-primary">{localError || managerError}</p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {isSaving ? 'SAVING...' : editingOfferId ? 'UPDATE OFFER' : 'CREATE OFFER'}
          </button>
          {editingOfferId && (
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
        <h3 className="mb-4 text-xl font-black">All Offers</h3>

        {isLoading ? (
          <p className="text-sm text-ink-muted">Loading offers...</p>
        ) : sortedOffers.length === 0 ? (
          <p className="text-sm text-ink-muted">No offers created yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedOffers.map(offer => (
              <div
                key={offer.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="space-y-1">
                  <p className="font-bold">{offer.title}</p>
                  <p className="text-xs text-ink-muted">{offer.description}</p>
                  <p className="text-xs text-ink-muted">
                    {offer.couponCode} • {offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`} • Min ₹{offer.minOrderAmount}
                    {typeof offer.maxDiscountAmount === 'number' ? ` • Max ₹${offer.maxDiscountAmount}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(offer)}
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => void handleDelete(offer.id)}
                    className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                  >
                    DELETE
                  </button>
                  <button
                    onClick={() => void onToggleOfferStatus(offer.id, !offer.isActive)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${
                      offer.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-ink-muted'
                    }`}
                  >
                    {offer.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
