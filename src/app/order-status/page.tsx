"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OrderTimer from '@/components/OrderTimer';
import { ShoppingBag, ChevronLeft, CheckCircle, Clock, Truck, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  _id: string;
  tableNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'Pending' | 'Confirmed' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
  createdAt: string;
  estimatedPrepTime: number;
  isDelayedCompensationApplied?: boolean;
  compensationNote?: string;
}

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableNumber = searchParams.get('table') || '1';
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?tableNumber=${tableNumber}`);
      if (res.ok) {
        const data = await res.json();
        // Only show active orders (not delivered or cancelled)
        const activeOrders = data.filter((o: Order) => 
            !['Delivered', 'Cancelled'].includes(o.status)
        );
        setOrders(activeOrders);
      }
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // 10s poll
    return () => clearInterval(interval);
  }, [tableNumber]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-6 h-6 text-amber-500" />;
      case 'Confirmed': return <CheckCircle className="w-6 h-6 text-blue-500" />;
      case 'Preparing': return <Clock className="w-6 h-6 text-orange-500 animate-spin-slow" />;
      case 'Ready': return <ShoppingBag className="w-6 h-6 text-green-500" />;
      case 'Delivered': return <Truck className="w-6 h-6 text-gray-500" />;
      case 'Cancelled': return <XCircle className="w-6 h-6 text-red-500" />;
      default: return <AlertCircle className="w-6 h-6 text-gray-500" />;
    }
  };

  const statusColors: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    Preparing: 'bg-orange-50 text-orange-700 border-orange-200',
    Ready: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header tableNumber={tableNumber} />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link href={`/?table=${tableNumber}`} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 rounded-full px-4 py-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </Link>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order Tracker</h1>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 font-bold tracking-tight">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 px-6">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">No active orders found</h2>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">Your current table has no pending or preparing orders. Ready to eat something delicious?</p>
              <Link href={`/?table=${tableNumber}`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-black px-8 py-4 rounded-2xl hover:scale-105 transition-all active:scale-95 text-lg">
                <span>Browse Menu</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order._id} className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden hover:border-primary/20 transition-all">
                  <div className="p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-1">Order Ref</span>
                        <h3 className="text-sm font-mono font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded">#{order._id.slice(-8).toUpperCase()}</h3>
                      </div>
                      <div className={`px-4 py-2 rounded-2xl border-2 flex items-center gap-2 ${statusColors[order.status] || 'bg-gray-50'}`}>
                        {getStatusIcon(order.status)}
                        <span className="font-black text-sm uppercase tracking-tight">{order.status}</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-900 text-white text-xs font-black shrink-0">{item.quantity}×</span>
                            <span className="font-bold text-gray-800">{item.name}</span>
                          </div>
                          <span className="text-sm font-black text-gray-600 text-right">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-gray-200 mb-2">
                      <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Total Paid</span>
                      <span className="text-2xl font-black text-gray-900 tracking-tight">₹{order.totalAmount.toFixed(2)}</span>
                    </div>

                    <OrderTimer 
                        createdAt={order.createdAt} 
                        estimatedPrepTime={order.estimatedPrepTime} 
                        status={order.status} 
                    />

                    {/* Compensation Alert */}
                    {order.isDelayedCompensationApplied && (
                      <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-6 h-6 text-amber-600 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-black text-amber-900 text-sm uppercase tracking-tight">Enjoy a gift on us! 🍵</h4>
                          <p className="text-amber-700 text-sm font-medium leading-tight mt-0.5">
                            {order.compensationNote || "Your order was delayed. Please enjoy a complimentary item on us!"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {order.status === 'Ready' && (
                    <div className="bg-green-600 text-white p-6 flex items-center gap-4 justify-center text-xl font-black shadow-inner">
                      <CheckCircle className="w-8 h-8 animate-bounce" />
                      <span>Your order is ready to serve!</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default function OrderStatusPage() {
  return (
    <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-black text-gray-900">Loading Order Status...</p>
          </div>
        </div>
    }>
      <OrderStatusContent />
    </Suspense>
  );
}
