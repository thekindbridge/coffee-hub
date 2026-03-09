import DeliveryTrackingMap, {
  type DeliveryTrackingLocation,
} from '../components/DeliveryTrackingMap';

export interface OrderTrackingPageProps {
  orderId: string;
  coffeeShopLocation: DeliveryTrackingLocation;
  customerLocation: DeliveryTrackingLocation;
}

export default function OrderTrackingPage({
  orderId,
  coffeeShopLocation,
  customerLocation,
}: OrderTrackingPageProps) {
  return (
    <main className="min-h-screen w-full bg-[#f6efe6] px-4 py-6 text-[#1f140f] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#9a6b43]">
            Coffee Hub
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-[#2b1b13] sm:text-4xl">
                Track your delivery
              </h1>
              <p className="mt-1 text-sm text-[#6b5445]">
                Watch the rider move in real time and follow the live route to your doorstep.
              </p>
            </div>
            <div className="rounded-full border border-[#d8c4b4] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5b4334]">
              Order #{orderId}
            </div>
          </div>
        </header>

        <DeliveryTrackingMap
          coffeeShopLocation={coffeeShopLocation}
          customerLocation={customerLocation}
          orderId={orderId}
        />
      </section>
    </main>
  );
}
