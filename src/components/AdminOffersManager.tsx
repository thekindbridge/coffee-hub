import { useMemo, useState } from 'react';
import type { Offer, OfferInput } from '../types';

interface OfferFormState {
  couponCode: string;
  discountPercentage: string;
}

const initialOfferForm: OfferFormState = {
  couponCode: '',
  discountPercentage: '',
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

export default function AdminOffersManager(props: AdminOffersManagerProps) {
  const {
    offers,
    isLoading,
    managerError,
    onCreateOffer,
    onToggleOfferStatus,
  } = props;

  const [offerForm, setOfferForm] = useState<OfferFormState>(initialOfferForm);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const sortedOffers = useMemo(
    () => [...offers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [offers],
  );

  const validateAndBuildPayload = (): OfferInput | null => {
    const couponCode = toUppercaseCouponCode(offerForm.couponCode);
    const discountPercentage = Number(offerForm.discountPercentage);

    if (!couponCode) {
      setLocalError('Coupon code is required.');
      return null;
    }

    if (!/^[A-Z0-9_-]+$/.test(couponCode)) {
      setLocalError('Use uppercase letters, numbers, "_" or "-".');
      return null;
    }

    const duplicateOffer = offers.find(existingOffer => existingOffer.couponCode === couponCode);
    if (duplicateOffer) {
      setLocalError('Coupon code already exists.');
      return null;
    }

    if (!Number.isFinite(discountPercentage) || discountPercentage <= 0 || discountPercentage > 100) {
      setLocalError('Discount percentage must be 1 to 100.');
      return null;
    }

    return {
      title: `${discountPercentage}% OFF`,
      description: `${discountPercentage}% off with code ${couponCode}`,
      couponCode,
      discountType: 'percentage',
      discountValue: discountPercentage,
      minOrderAmount: 0,
      isActive: true,
    };
  };

  const handleCreateCoupon = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) {
      return;
    }

    setIsSaving(true);
    setLocalError('');
    try {
      await onCreateOffer(payload);
      setOfferForm(initialOfferForm);
    } catch (error) {
      console.error('Failed to create coupon', error);
      setLocalError(error instanceof Error ? error.message : 'Unable to create coupon.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black">Promos</h2>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-lg font-black">Create Coupon</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={offerForm.couponCode}
            onChange={event => setOfferForm(prev => ({ ...prev, couponCode: toUppercaseCouponCode(event.target.value) }))}
            placeholder="Coupon code"
            className="min-h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-bold uppercase focus:border-primary focus:outline-none"
          />
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={offerForm.discountPercentage}
            onChange={event => setOfferForm(prev => ({ ...prev, discountPercentage: event.target.value }))}
            placeholder="Discount %"
            className="min-h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-bold focus:border-primary focus:outline-none"
          />
        </div>

        {(localError || managerError) && (
          <p className="mt-3 text-sm text-primary">{localError || managerError}</p>
        )}

        <button
          onClick={() => void handleCreateCoupon()}
          disabled={isSaving}
          className="mt-3 min-h-12 rounded-2xl bg-primary px-5 text-sm font-black text-white disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Create Coupon'}
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-ink-muted">
            Loading promos...
          </div>
        ) : sortedOffers.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-ink-muted">
            No promos created yet.
          </div>
        ) : (
          sortedOffers.map(offer => (
            <article
              key={offer.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black">{offer.couponCode}</p>
                  <p className="text-sm text-ink-muted">
                    {offer.discountType === 'percentage' ? `${offer.discountValue}%` : '0%'}
                  </p>
                </div>
                <button
                  onClick={() => void onToggleOfferStatus(offer.id, !offer.isActive)}
                  className={`min-h-12 min-w-20 rounded-2xl px-4 text-sm font-black ${
                    offer.isActive
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-white/10 text-ink-muted'
                  }`}
                >
                  {offer.isActive ? 'ON' : 'OFF'}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
