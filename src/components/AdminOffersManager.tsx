import { useMemo, useState } from 'react';
import { BadgePercent, Sparkles } from 'lucide-react';

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
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Promo lab</p>
        <h2 className="mt-1 text-[1.45rem] font-semibold text-accent">Offers</h2>
      </div>

      <div className="coffee-surface-soft rounded-[24px] p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-highlight/12 text-highlight">
            <BadgePercent size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-accent">Create coupon</h3>
            <p className="text-xs text-ink-muted">Add compact promo codes for checkout.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={offerForm.couponCode}
            onChange={event => setOfferForm(prev => ({ ...prev, couponCode: toUppercaseCouponCode(event.target.value) }))}
            placeholder="Coupon code"
            className="coffee-input font-semibold uppercase"
          />
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={offerForm.discountPercentage}
            onChange={event => setOfferForm(prev => ({ ...prev, discountPercentage: event.target.value }))}
            placeholder="Discount %"
            className="coffee-input"
          />
        </div>

        {(localError || managerError) && (
          <p className="mt-3 text-sm text-primary">{localError || managerError}</p>
        )}

        <button onClick={() => void handleCreateCoupon()} disabled={isSaving} className="coffee-btn-primary mt-4 disabled:opacity-60">
          <Sparkles size={16} />
          {isSaving ? 'Saving...' : 'Create coupon'}
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="coffee-surface-soft rounded-[24px] p-5 text-sm text-ink-muted">
            Loading promos...
          </div>
        ) : sortedOffers.length === 0 ? (
          <div className="coffee-surface-soft rounded-[24px] p-5 text-sm text-ink-muted">
            No promos created yet.
          </div>
        ) : (
          sortedOffers.map(offer => (
            <article
              key={offer.id}
              className="coffee-surface-soft flex items-center justify-between gap-3 rounded-[24px] p-4"
            >
              <div>
                <p className="text-sm font-semibold text-accent">{offer.couponCode}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {offer.discountType === 'percentage' ? `${offer.discountValue}% off` : 'Offer'}
                </p>
              </div>
              <button
                onClick={() => void onToggleOfferStatus(offer.id, !offer.isActive)}
                className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  offer.isActive
                    ? 'border border-emerald-300/20 bg-emerald-500/10 text-emerald-300'
                    : 'border border-white/10 bg-white/6 text-ink-muted'
                }`}
              >
                {offer.isActive ? 'Live' : 'Off'}
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
