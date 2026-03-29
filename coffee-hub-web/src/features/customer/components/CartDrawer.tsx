import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coffee,
  Minus,
  Plus,
  Sparkles,
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
import { CartDrawerCheckoutDetails } from './CartDrawerCheckoutDetails';

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
              <CartDrawerCheckoutDetails
                cart={cart}
                cartCount={cartCount}
                cartTotal={cartTotal}
                discountAmount={discountAmount}
                deliveryFee={deliveryFee}
                payableCartTotal={payableCartTotal}
                customerDetails={customerDetails}
                setCustomerDetails={setCustomerDetails}
                selectedAddressIndex={selectedAddressIndex}
                setSelectedAddressIndex={setSelectedAddressIndex}
                savedAddressOptions={savedAddressOptions}
                isShopOpen={isShopOpen}
                shopStatusMessage={shopStatusMessage}
                selectedAddressLabel={selectedAddressLabel}
                checkoutAddressSummary={checkoutAddressSummary}
                isCheckoutAddressListOpen={isCheckoutAddressListOpen}
                setIsCheckoutAddressListOpen={setIsCheckoutAddressListOpen}
                checkoutError={checkoutError}
                setCheckoutError={setCheckoutError}
                isLocatingCustomer={isLocatingCustomer}
                customerLocationError={customerLocationError}
                hasCheckoutAddressSelectionRef={hasCheckoutAddressSelectionRef}
                onCaptureLocation={onCaptureLocation}
              />
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
