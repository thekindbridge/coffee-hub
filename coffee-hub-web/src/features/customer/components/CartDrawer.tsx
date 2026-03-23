import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coffee,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { CURRENCY_SYMBOL } from '../../app/lib/constants';
import type {
  CheckoutCustomerDetails,
  Order,
  CartItem,
} from '../../../types';
import type {
  CheckoutStep,
  SavedAddressOption,
  SelectedAddressIndex,
} from '../../app/types';

type CartDrawerProps = {
  isOpen: boolean;
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  hasCartItems: boolean;
  discountAmount: number;
  deliveryFee: number;
  payableCartTotal: number;
  checkoutStep: CheckoutStep;
  setCheckoutStep: Dispatch<SetStateAction<CheckoutStep>>;
  customerDetails: CheckoutCustomerDetails;
  setCustomerDetails: Dispatch<SetStateAction<CheckoutCustomerDetails>>;
  selectedAddressIndex: SelectedAddressIndex;
  setSelectedAddressIndex: Dispatch<SetStateAction<SelectedAddressIndex>>;
  savedAddressOptions: SavedAddressOption[];
  isShopOpen: boolean;
  shopTimingRangeLabel: string;
  shopStatusMessage: string;
  selectedAddressLabel: string;
  checkoutAddressSummary: string;
  isCheckoutAddressListOpen: boolean;
  setIsCheckoutAddressListOpen: Dispatch<SetStateAction<boolean>>;
  checkoutError: string;
  setCheckoutError: Dispatch<SetStateAction<string>>;
  isLocatingCustomer: boolean;
  customerLocationError: string;
  isPlacingOrder: boolean;
  couponInput: string;
  setCouponInput: Dispatch<SetStateAction<string>>;
  appliedCouponCode: string;
  couponError: string;
  couponSuccess: string;
  isApplyingCoupon: boolean;
  isCouponAppliedPulseVisible: boolean;
  checkoutPrimaryActionLabel: string;
  orderStatus: Order | null;
  hasCheckoutAddressSelectionRef: MutableRefObject<boolean>;
  onClose: () => void;
  onBrowseMenu: () => void;
  onQuantityChange: (item: CartItem, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  onCaptureLocation: () => void;
  onPlaceOrder: () => void;
  onTrackOrder: () => void;
};

export const CartDrawer = ({
  isOpen,
  cart,
  cartCount,
  cartTotal,
  hasCartItems,
  discountAmount,
  deliveryFee,
  payableCartTotal,
  checkoutStep,
  setCheckoutStep,
  customerDetails,
  setCustomerDetails,
  selectedAddressIndex,
  setSelectedAddressIndex,
  savedAddressOptions,
  isShopOpen,
  shopTimingRangeLabel,
  shopStatusMessage,
  selectedAddressLabel,
  checkoutAddressSummary,
  isCheckoutAddressListOpen,
  setIsCheckoutAddressListOpen,
  checkoutError,
  setCheckoutError,
  isLocatingCustomer,
  customerLocationError,
  isPlacingOrder,
  couponInput,
  setCouponInput,
  appliedCouponCode,
  couponError,
  couponSuccess,
  isApplyingCoupon,
  isCouponAppliedPulseVisible,
  checkoutPrimaryActionLabel,
  orderStatus,
  hasCheckoutAddressSelectionRef,
  onClose,
  onBrowseMenu,
  onQuantityChange,
  onRemoveItem,
  onApplyCoupon,
  onRemoveCoupon,
  onCaptureLocation,
  onPlaceOrder,
  onTrackOrder,
}: CartDrawerProps) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[70] mx-auto flex max-h-[90vh] max-w-screen-md flex-col rounded-t-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(23,16,14,0.98),rgba(11,8,7,0.98))] shadow-[0_-24px_60px_rgba(0,0,0,0.42)]"
        >
          <div className="border-b border-white/6 px-5 pb-4 pt-3">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/10" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">Cart drawer</p>
                <h2 className="mt-1 text-[1.55rem] font-semibold text-accent">
                  {checkoutStep === 'cart'
                    ? 'Your cart'
                    : checkoutStep === 'details'
                      ? 'Checkout details'
                      : 'Order ready'}
                </h2>
              </div>
              <button onClick={onClose} className="coffee-icon-btn">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-grow space-y-5 overflow-y-auto px-5 pb-5 pt-4">
            <div
              className={`rounded-[22px] border px-4 py-3 text-sm ${
                isShopOpen
                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                  : 'border-[#f4c16e]/24 bg-[linear-gradient(135deg,rgba(244,193,110,0.14),rgba(68,45,28,0.82))] text-[#fff0d5]'
              }`}
            >
              <div className="flex items-start gap-3">
                <Clock size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">
                    {isShopOpen ? 'Shop open now' : 'Orders paused for now'}
                  </p>
                  <p className="mt-1 text-xs leading-5 opacity-90">{shopStatusMessage}</p>
                  <p className="mt-1 text-xs leading-5 opacity-75">
                    Ordering hours: {shopTimingRangeLabel}
                  </p>
                </div>
              </div>
            </div>

            {checkoutStep === 'cart' && (
              <>
                {!hasCartItems ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="coffee-surface-soft flex min-h-[320px] flex-col items-center justify-center rounded-[28px] px-6 text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/16 text-secondary">
                      <Coffee size={28} />
                    </div>
                    <p className="mt-5 text-[1.4rem] font-semibold text-accent">Your cart is empty</p>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">
                      Add items from menu to start your order.
                    </p>
                    <button onClick={onBrowseMenu} className="coffee-btn-primary mt-6">
                      <ArrowRight size={16} />
                      Browse Menu
                    </button>
                  </motion.div>
                ) : (
                  <>
                    {cart.map(item => (
                      <div key={item.id} className="coffee-surface-soft flex gap-3 rounded-[24px] p-3">
                        <div className="h-[78px] w-[78px] flex-shrink-0 overflow-hidden rounded-[20px]">
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold text-accent">{item.name}</h4>
                              <p className="mt-1 text-sm font-semibold text-secondary">{CURRENCY_SYMBOL}{item.price}</p>
                            </div>
                            <div className="text-sm font-semibold text-accent">{CURRENCY_SYMBOL}{item.price * item.quantity}</div>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#120d0b]/92 p-1.5">
                              <button onClick={() => onQuantityChange(item, -1)} className="coffee-icon-btn h-8 w-8 rounded-full border-none bg-white/6">
                                <Minus size={14} />
                              </button>
                              <span className="min-w-5 text-center text-sm font-semibold text-accent">{item.quantity}</span>
                              <button onClick={() => onQuantityChange(item, 1)} className="coffee-icon-btn h-8 w-8 rounded-full border-none bg-primary text-white hover:text-white">
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted hover:text-accent"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="coffee-surface-soft rounded-[24px] p-4">
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
                        Enter Coupon Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={event => setCouponInput(event.target.value.toUpperCase())}
                          placeholder="e.g. SAVE20"
                          className="coffee-input min-h-11 uppercase"
                        />
                        <button
                          onClick={() => (appliedCouponCode ? onRemoveCoupon() : onApplyCoupon())}
                          disabled={isApplyingCoupon || !hasCartItems}
                          className="coffee-btn-primary min-h-11 px-4 text-[11px] uppercase tracking-[0.16em] disabled:opacity-60"
                        >
                          {appliedCouponCode ? 'REMOVE' : isApplyingCoupon ? 'APPLYING...' : 'APPLY'}
                        </button>
                      </div>
                      {couponError && <p className="mt-2 text-xs font-semibold text-primary">{couponError}</p>}
                      <AnimatePresence mode="wait">
                        {couponSuccess && (
                          <motion.p
                            key={couponSuccess}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="mt-2 text-xs font-semibold text-emerald-400"
                          >
                            {couponSuccess}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="coffee-surface-soft space-y-2 rounded-[24px] p-4">
                      <div className="flex justify-between text-sm text-ink-muted">
                        <span>Subtotal</span>
                        <span>{CURRENCY_SYMBOL}{cartTotal}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-400">
                          <span>Discount</span>
                          <span>-{CURRENCY_SYMBOL}{discountAmount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-ink-muted">
                        <span>Delivery Charge</span>
                        <span>{CURRENCY_SYMBOL}{deliveryFee}</span>
                      </div>
                      <motion.div
                        animate={{ scale: isCouponAppliedPulseVisible ? [1, 1.03, 1] : 1 }}
                        transition={{ duration: 0.35 }}
                        className="flex justify-between border-t border-white/6 pt-3 text-[1.05rem] font-semibold"
                      >
                        <span>Final Total</span>
                        <span className="text-highlight">{CURRENCY_SYMBOL}{payableCartTotal}</span>
                      </motion.div>
                    </div>
                  </>
                )}
              </>
            )}

            {checkoutStep === 'details' && (
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
                      setCustomerDetails(prev => ({ ...prev, name: event.target.value }));
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
                      setCustomerDetails(prev => ({ ...prev, phone: event.target.value }));
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
                        onClick={() => setIsCheckoutAddressListOpen(prev => !prev)}
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
                                  setCustomerDetails(prev => ({ ...prev, address: event.target.value }));
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
                        setCustomerDetails(prev => ({ ...prev, address: event.target.value }));
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
            )}

            {checkoutStep === 'success' && (
              <div className="py-10 text-center">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-500/14 text-emerald-400"
                >
                  <Coffee size={28} className="absolute text-accent/70" />
                  <CheckCircle2 size={42} className="relative z-10" />
                </motion.div>
                <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  <Sparkles size={13} />
                  Freshly confirmed
                </div>
                <h2 className="mt-5 text-[1.75rem] font-semibold text-accent">Order confirmed</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">Your order #{orderStatus?.id} is waiting for admin confirmation.</p>
                <p className="mt-2 text-sm font-semibold text-secondary">Cash on delivery selected.</p>
                <button onClick={onTrackOrder} className="coffee-btn-primary mt-8 w-full">
                  <Clock size={16} />
                  Track order
                </button>
              </div>
            )}
          </div>

          {checkoutStep !== 'success' && (
            <div className="border-t border-white/6 bg-[#0f0b09]/94 px-5 py-4">
              {checkoutStep === 'cart' ? (
                hasCartItems ? (
                  <button
                    onClick={() => {
                      setCheckoutError('');
                      setCheckoutStep('details');
                    }}
                    disabled={!hasCartItems}
                    className="coffee-btn-primary w-full justify-center disabled:opacity-70"
                  >
                    <ArrowRight size={16} />
                    Proceed to checkout
                  </button>
                ) : null
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setCheckoutError('');
                      setCheckoutStep('cart');
                    }}
                    className="coffee-btn-secondary w-[36%] justify-center"
                  >
                    Back
                  </button>
                  <button
                    onClick={onPlaceOrder}
                    disabled={isPlacingOrder || !hasCartItems || !isShopOpen}
                    className="coffee-btn-primary flex-grow justify-center disabled:opacity-70"
                  >
                    {checkoutPrimaryActionLabel}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
