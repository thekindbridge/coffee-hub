import { AnimatePresence, motion } from 'motion/react';
import { MapPin, Wallet } from 'lucide-react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { CURRENCY_SYMBOL } from '../../app/lib/constants';
import type { CartItem, CheckoutCustomerDetails } from '../../../types';
import type { SavedAddressOption, SelectedAddressIndex } from '../../app/types';

type CartDrawerCheckoutDetailsProps = {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  discountAmount: number;
  deliveryFee: number;
  payableCartTotal: number;
  customerDetails: CheckoutCustomerDetails;
  setCustomerDetails: Dispatch<SetStateAction<CheckoutCustomerDetails>>;
  selectedAddressIndex: SelectedAddressIndex;
  setSelectedAddressIndex: Dispatch<SetStateAction<SelectedAddressIndex>>;
  savedAddressOptions: SavedAddressOption[];
  isShopOpen: boolean;
  shopStatusMessage: string;
  selectedAddressLabel: string;
  checkoutAddressSummary: string;
  isCheckoutAddressListOpen: boolean;
  setIsCheckoutAddressListOpen: Dispatch<SetStateAction<boolean>>;
  checkoutError: string;
  setCheckoutError: Dispatch<SetStateAction<string>>;
  isLocatingCustomer: boolean;
  customerLocationError: string;
  hasCheckoutAddressSelectionRef: MutableRefObject<boolean>;
  onCaptureLocation: () => void;
};

export const CartDrawerCheckoutDetails = ({
  cart,
  cartCount,
  cartTotal,
  discountAmount,
  deliveryFee,
  payableCartTotal,
  customerDetails,
  setCustomerDetails,
  selectedAddressIndex,
  setSelectedAddressIndex,
  savedAddressOptions,
  isShopOpen,
  shopStatusMessage,
  selectedAddressLabel,
  checkoutAddressSummary,
  isCheckoutAddressListOpen,
  setIsCheckoutAddressListOpen,
  checkoutError,
  setCheckoutError,
  isLocatingCustomer,
  customerLocationError,
  hasCheckoutAddressSelectionRef,
  onCaptureLocation,
}: CartDrawerCheckoutDetailsProps) => (
  <div className="space-y-5">
    {!isShopOpen && (
      <div className="rounded-[24px] border border-[#f4c16e]/24 bg-[linear-gradient(135deg,rgba(244,193,110,0.12),rgba(65,43,26,0.74))] px-4 py-3 text-sm text-[#fff0d5]">
        <p className="font-semibold text-accent">Ordering update</p>
        <p className="mt-1 text-xs leading-5 text-[#f5ddbb]">{shopStatusMessage}</p>
      </div>
    )}

    <div className="coffee-surface-soft rounded-[26px] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">Order Summary</p>
          <p className="mt-1 text-sm text-ink-muted">{cartCount} item{cartCount === 1 ? '' : 's'} in this order</p>
        </div>
        <p className="text-lg font-semibold text-highlight">{CURRENCY_SYMBOL}{payableCartTotal}</p>
      </div>
      <div className="mt-4 space-y-3">
        {cart.map(item => (
          <div key={`summary-${item.id}`} className="flex items-start justify-between gap-4 text-sm">
            <div>
              <p className="font-semibold text-accent">{item.name}</p>
              <p className="text-xs text-ink-muted">Qty {item.quantity}</p>
            </div>
            <span className="font-semibold text-ink-muted">{CURRENCY_SYMBOL}{item.price * item.quantity}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
        <div className="flex justify-between text-ink-muted">
          <span>Subtotal</span>
          <span>{CURRENCY_SYMBOL}{cartTotal}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Discount</span>
            <span>-{CURRENCY_SYMBOL}{discountAmount}</span>
          </div>
        )}
        <div className="flex justify-between text-ink-muted">
          <span>Delivery Charge</span>
          <span>{CURRENCY_SYMBOL}{deliveryFee}</span>
        </div>
        <div className="flex justify-between pt-2 text-base font-semibold">
          <span>Total Amount</span>
          <span className="text-highlight">{CURRENCY_SYMBOL}{payableCartTotal}</span>
        </div>
      </div>
    </div>

    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">Full Name</label>
      <input
        type="text"
        className="coffee-input"
        value={customerDetails.name}
        onChange={event => {
          setCheckoutError('');
          setCustomerDetails(previousDetails => ({ ...previousDetails, name: event.target.value }));
        }}
      />
    </div>

    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">Phone Number</label>
      <input
        type="tel"
        className="coffee-input"
        value={customerDetails.phone}
        onChange={event => {
          setCheckoutError('');
          setCustomerDetails(previousDetails => ({ ...previousDetails, phone: event.target.value }));
        }}
      />
    </div>

    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">Delivery Address</label>
      {savedAddressOptions.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded-[18px] border border-white/10 bg-[#120d0b]/75 px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                  {selectedAddressLabel}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                  {checkoutAddressSummary || 'Add a delivery address.'}
                </p>
              </div>
              <MapPin size={14} className="mt-0.5 text-secondary" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCheckoutAddressListOpen(previousOpen => !previousOpen)}
            className="coffee-btn-secondary w-full justify-center"
          >
            {isCheckoutAddressListOpen ? 'Hide Addresses' : 'All Addresses'}
          </button>

          <AnimatePresence initial={false}>
            {isCheckoutAddressListOpen && (
              <motion.div
                key="checkout-addresses"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-2 overflow-hidden"
              >
                {savedAddressOptions.map(option => {
                  const isSelected = selectedAddressIndex === option.index;
                  return (
                    <button
                      key={`saved-address-${option.index}`}
                      type="button"
                      onClick={() => {
                        setCheckoutError('');
                        hasCheckoutAddressSelectionRef.current = true;
                        setSelectedAddressIndex(option.index);
                        setIsCheckoutAddressListOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 rounded-[18px] border px-3 py-2 text-left transition ${
                        isSelected
                          ? 'border-secondary/40 bg-white/5 shadow-[0_10px_20px_rgba(62,39,35,0.14)]'
                          : 'border-white/10 bg-[#120d0b]/70 hover:border-white/20'
                      }`}
                    >
                      <span
                        className={`mt-1 flex h-3 w-3 items-center justify-center rounded-full border ${
                          isSelected ? 'border-secondary bg-secondary' : 'border-white/20'
                        }`}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#120d0b]" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-accent">{option.label}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{option.value}</p>
                      </div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutError('');
                    hasCheckoutAddressSelectionRef.current = true;
                    setSelectedAddressIndex('new');
                    setIsCheckoutAddressListOpen(true);
                  }}
                  className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-2 text-left transition ${
                    selectedAddressIndex === 'new'
                      ? 'border-secondary/40 bg-white/5 shadow-[0_10px_20px_rgba(62,39,35,0.14)]'
                      : 'border-white/10 bg-[#120d0b]/70 hover:border-white/20'
                  }`}
                >
                  <span
                    className={`flex h-3 w-3 items-center justify-center rounded-full border ${
                      selectedAddressIndex === 'new'
                        ? 'border-secondary bg-secondary'
                        : 'border-white/20'
                    }`}
                  >
                    {selectedAddressIndex === 'new' && <span className="h-1.5 w-1.5 rounded-full bg-[#120d0b]" />}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-accent">Enter New Address</p>
                    <p className="mt-1 text-[11px] text-ink-muted">Type a new delivery address.</p>
                  </div>
                </button>
                {selectedAddressIndex === 'new' && (
                  <textarea
                    className="coffee-textarea min-h-[88px]"
                    value={customerDetails.address}
                    onChange={event => {
                      setCheckoutError('');
                      setSelectedAddressIndex('new');
                      hasCheckoutAddressSelectionRef.current = true;
                      setCustomerDetails(previousDetails => ({
                        ...previousDetails,
                        address: event.target.value,
                      }));
                    }}
                    placeholder="Street, landmark, city"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <textarea
          className="coffee-textarea"
          value={customerDetails.address}
          onChange={event => {
            setCheckoutError('');
            setSelectedAddressIndex('new');
            hasCheckoutAddressSelectionRef.current = true;
            setCustomerDetails(previousDetails => ({
              ...previousDetails,
              address: event.target.value,
            }));
          }}
          placeholder="Street, landmark, city"
        />
      )}
    </div>

    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
            Live Delivery Location
          </label>
        </div>
        <button
          onClick={onCaptureLocation}
          disabled={isLocatingCustomer}
          className="coffee-btn-primary min-h-11 px-4 text-[11px] uppercase tracking-[0.18em] disabled:opacity-60"
        >
          {isLocatingCustomer ? 'Locating...' : 'Location'}
        </button>
      </div>
      <div className="mt-4 rounded-[18px] border border-white/10 bg-[#120d0b]/80 px-4 py-3 text-sm">
        {customerDetails.location ? (
          <p className="font-semibold text-accent">Location captured successfully.</p>
        ) : (
          <p className="text-ink-muted">Location not added yet.</p>
        )}
      </div>
      {customerLocationError && (
        <p className="mt-3 text-xs font-semibold text-primary">{customerLocationError}</p>
      )}
    </div>

    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">Payment Method</label>
      <div className="rounded-[24px] border border-secondary/30 bg-[linear-gradient(135deg,rgba(111,78,55,0.22),rgba(62,39,35,0.78))] px-4 py-4 shadow-[0_16px_32px_rgba(62,39,35,0.18)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-secondary">
            <Wallet size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-accent">Cash on Delivery</p>
            <p className="mt-1 text-xs text-ink-muted">Pay when your order arrives at your doorstep.</p>
          </div>
        </div>
      </div>
    </div>

    {checkoutError && (
      <div className="rounded-[22px] border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
        {checkoutError}
      </div>
    )}
  </div>
);
