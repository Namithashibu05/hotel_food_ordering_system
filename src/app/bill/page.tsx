"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Receipt, ChevronLeft, CreditCard, CheckCircle, AlertCircle, Printer, Star, Send, Sparkles } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  tableNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

function BillContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableNumber = searchParams.get('table') || '1';
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const scriptLoaded = useRef(false);

  // Load Razorpay script
  useEffect(() => {
    if (scriptLoaded.current) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => { scriptLoaded.current = true; };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const key = `table_session_${tableNumber}`;
    const sid = sessionStorage.getItem(key) || "";
    setSessionId(sid);

    const fetchOrders = async () => {
      try {
        const url = sid 
          ? `/api/orders?tableNumber=${tableNumber}&sessionId=${sid}`
          : `/api/orders?tableNumber=${tableNumber}`;
          
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json().catch(() => []);
          const activeOrders = (Array.isArray(data) ? data : []).filter((o: Order) => 
            !['Cancelled'].includes(o.status)
          );
          setOrders(activeOrders);
        }
      } catch (error) {
        console.error('Failed to fetch orders', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [tableNumber]);

  const handleSubmitRating = async () => {
    if (!rating) {
      toast.error("Please select a star rating");
      return;
    }

    setIsSubmittingRating(true);
    try {
      const res = await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment,
          tableNumber,
          sessionId,
        }),
      });

      if (res.ok) {
        toast.success("Thank you for your feedback!");
        setRatingSubmitted(true);
      } else {
        throw new Error("Failed to submit rating");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit rating");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Aggregate items
  let aggregatedItems: { name: string; quantity: number; price: number }[] = [];
  orders.forEach(order => {
    order.items.forEach(item => {
      const existing = aggregatedItems.find(i => i.name === item.name && i.price === item.price);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        aggregatedItems.push({ ...item });
      }
    });
  });

  const subtotal = aggregatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const serviceCharge = subtotal * 0.02;
  const grandTotal = subtotal + tax + serviceCharge;

  const handlePayNow = async () => {
    if (!sessionId) {
      toast.error("Session information missing. Please re-scan QR.");
      return;
    }

    setIsPaying(true);
    try {
      const res = await fetch("/api/payment/session-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, tableNumber }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`Invalid response from server (${res.status})`);
      }

      if (!res.ok) throw new Error(data?.error || "Failed to initiate payment");

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Hotel Delish",
        description: `Final Bill - Table ${tableNumber}`,
        order_id: data.razorpayOrderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json().catch(() => ({ error: "Invalid verification response" }));
            if (verifyRes.ok && verifyData.success) {
              toast.success("Payment Successful!");
              router.push(`/order-status?table=${tableNumber}`);
            } else {
              throw new Error(verifyData.error || "Verification failed");
            }
          } catch (err: any) {
            toast.error(err.message || "Payment verification failed");
          }
        },
        theme: { color: "#4f46e5" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 print:bg-white">
      <div className="print:hidden">
        <Header tableNumber={tableNumber} />
      </div>
      
      <main className="container mx-auto px-4 py-8 flex-1 flex flex-col items-center print:py-0 print:px-0">
        <div className="max-w-md w-full">
          <div className="flex items-center justify-between mb-8 print:hidden">
            <Link href={`/order-status?table=${tableNumber}`} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 rounded-full px-4 py-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Orders</span>
            </Link>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
               <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
               <p className="mt-4 text-gray-500 font-bold">Generating your bill...</p>
             </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-gray-200 px-6 shadow-sm print:hidden">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Payment Complete</h2>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">Thank you for visiting Hotel Delish! We hope you enjoyed your meal.</p>
              
              {!ratingSubmitted ? (
                <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">How was your experience?</h3>
                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="transition-all transform hover:scale-125 active:scale-95"
                      >
                        <Star 
                          className={`w-8 h-8 ${
                            star <= (hoverRating || rating) 
                              ? "fill-yellow-400 text-yellow-400" 
                              : "text-slate-300"
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Tell us what you liked or what we can improve..."
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none mb-4 min-h-[100px] resize-none"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button
                    onClick={handleSubmitRating}
                    disabled={isSubmittingRating || !rating}
                    className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {isSubmittingRating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 rounded-3xl p-6 mb-8 border border-green-100 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                      <Sparkles className="w-6 h-6 text-green-600" />
                   </div>
                   <p className="text-green-800 font-bold">Feedback Received!</p>
                   <p className="text-green-600 text-xs mt-1 text-center">Your review helps us serve you better next time.</p>
                </div>
              )}

              <Link href={`/?table=${tableNumber}`} className="inline-flex items-center gap-2 border-2 border-slate-200 text-slate-500 font-black px-8 py-4 rounded-2xl hover:bg-slate-50 transition-all text-lg mb-4">
                Return to Menu
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-gray-200 overflow-hidden shadow-2xl print:shadow-none print:border-none print:rounded-none">
              <div className="p-8 pb-6 text-center border-b-2 border-dashed border-gray-200 mb-6 bg-gray-50/50 print:bg-white print:p-4">
                  <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">Hotel Delish</h2>
                  <p className="text-gray-400 text-[10px] uppercase font-black tracking-[0.2em] mb-4">Fine Dining Experience</p>
                  <div className="flex justify-center gap-6 text-[11px] font-bold text-gray-600">
                    <span className="py-1">{new Date().toLocaleDateString()}</span>
                  </div>
              </div>

              <div className="px-8 mb-8 print:px-4">
                  <table className="w-full">
                      <thead>
                          <tr className="border-b-2 border-gray-900">
                              <th className="pb-4 text-left font-black uppercase text-[10px] tracking-widest text-gray-400">Description</th>
                              <th className="pb-4 text-center font-black uppercase text-[10px] tracking-widest text-gray-400">Qty</th>
                              <th className="pb-4 text-right font-black uppercase text-[10px] tracking-widest text-gray-400">Amount</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {aggregatedItems.map((item, idx) => (
                              <tr key={idx} className="group">
                                  <td className="py-5">
                                    <span className="font-bold text-gray-800 block leading-tight">{item.name}</span>
                                    <span className="text-[10px] text-gray-400 font-medium">₹{item.price.toFixed(2)} / unit</span>
                                  </td>
                                  <td className="py-5 text-center text-gray-600 font-bold">{item.quantity}</td>
                                  <td className="py-5 text-right font-black text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              <div className="px-8 py-8 space-y-3 bg-gray-50 print:bg-white print:px-4 border-t-2 border-dashed border-gray-100">
                  <div className="flex justify-between text-gray-500 font-bold text-sm">
                      <span>Subtotal</span>
                      <span className="text-gray-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-bold text-sm">
                      <span>GST (5%)</span>
                      <span className="text-gray-900">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-bold text-sm pb-4 border-b border-gray-200">
                      <span>Service Charge (2%)</span>
                      <span className="text-gray-900">₹{serviceCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Payable</span>
                      <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{grandTotal.toFixed(2)}</span>
                  </div>
              </div>
              
              <div className="p-8 pt-4 space-y-4 print:hidden">
                  <div className="flex gap-4">
                    <button 
                      onClick={handlePayNow}
                      disabled={isPaying}
                      className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
                    >
                      {isPaying ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <CreditCard className="w-6 h-6" />
                      )}
                      <span className="text-lg">Proceed to Pay</span>
                    </button>
                    
                    <button 
                      onClick={() => window.print()}
                      className="px-6 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm"
                      title="Print Receipt"
                    >
                      <Printer className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                    <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-indigo-600 font-medium leading-relaxed">
                      Your payment is secured and encrypted. Once paid, your table session will be closed automatically. You can also pay at the counter.
                    </p>
                  </div>
              </div>

              <div className="hidden print:block text-center p-8 border-t-2 border-dashed border-gray-100">
                  <p className="font-bold text-gray-900">Thank You for Dining!</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Please Visit Again</p>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}

export default function BillPage() {
  return (
    <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-black text-gray-900">Loading your Bill...</p>
          </div>
        </div>
    }>
      <BillContent />
    </Suspense>
  );
}
