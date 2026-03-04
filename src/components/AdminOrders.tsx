import type { Order } from '../types';

interface AdminOrdersProps {
  orders: Order[];
  newOrderDocIds: string[];
  orderStatuses: Order['status'][];
  onUpdateStatus: (orderDocId: string, status: Order['status']) => void;
}

export default function AdminOrders({
  orders,
  newOrderDocIds,
  orderStatuses,
  onUpdateStatus,
}: AdminOrdersProps) {
  const highlightedOrders = new Set(newOrderDocIds);

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-ink-muted">
        No orders yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {orders.map(order => {
        const isNewOrder = highlightedOrders.has(order.doc_id);

        return (
          <div
            key={order.doc_id}
            className={`rounded-3xl border p-6 transition-all ${
              isNewOrder
                ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-xl font-black">Order #{order.id}</h4>
                <p className="text-sm text-ink-muted">{order.customer_name} • {order.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-primary">₹{order.total_amount}</p>
                <p className="text-[10px] font-bold uppercase text-ink-muted">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">Items</p>
                <div className="space-y-2 text-sm">
                  {order.items.map(item => (
                    <p key={item.id}>
                      {item.name} x{item.quantity}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="mb-2 text-xs font-bold uppercase text-ink-muted">Address</p>
              <p className="text-sm">{order.address}</p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {orderStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => onUpdateStatus(order.doc_id, status)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    order.status === status
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-ink-muted hover:bg-white/20'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
