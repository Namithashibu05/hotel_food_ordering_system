"use client";

import { useEffect, useState } from "react";
import { CartItem } from "./CartSidebar";
import { CheckCircle2, ShoppingBag, X, ArrowRight, ClipboardList } from "lucide-react";

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  tableNumber: string;
  customerName: string;
  notes: string;
  sessionId: string;
  onOrderSuccess: (orderId: string) => void;
  onOrderFailure: (error: string) => void;
}

type OrderView = "confirm" | "processing" | "success" | "failed";

export default function OrderConfirmationModal({
  isOpen,
  onClose,
  cart,
  tableNumber,
  customerName,
  notes,
  sessionId,
  onOrderSuccess,
  onOrderFailure,
}: OrderConfirmationModalProps) {
  const [view, setView] = useState<OrderView>("confirm");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successOrderId, setSuccessOrderId] = useState("");

  const total = cart.reduce(
    (acc, item) => acc + item.menuItem.price * item.quantity,
    0,
  );

  useEffect(() => {
    if (isOpen) {
      setView("confirm");
      setErrorMsg("");
      setSuccessOrderId("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    setView("processing");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber,
          customerNote: notes,
          sessionId,
          items: cart.map((i) => ({
            menuItem: i.menuItem._id,
            name: i.menuItem.name,
            price: i.menuItem.price,
            quantity: i.quantity,
          })),
          totalAmount: total,
          paymentMethod: "cod", // Defaulting to COD as payment happens later
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`Server returned an invalid response (${res.status})`);
      }

      if (!res.ok) throw new Error(data?.error || "Failed to place order");
      setSuccessOrderId(data._id);
      setView("success");
    } catch (err: any) {
      setView("failed");
      setErrorMsg(err.message || "Failed to place order.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    onOrderSuccess(successOrderId);
    onClose();
  };

  const handleFailedClose = () => {
    onOrderFailure(errorMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-indigo-950/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={view === "confirm" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-[3rem] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.5)] bg-white dark:bg-gray-950 animate-in zoom-in-95 duration-300 border border-white/20">
        {/* Gradient header bar */}
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* ─── CONFIRM VIEW ─── */}
        {view === "confirm" && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Step 2: Confirm
                  </span>
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                  Check Your Order
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Order summary card */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] p-6 mb-8 border border-gray-100 dark:border-gray-800 shadow-inner">
              <div className="space-y-4 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                {cart.map((item) => (
                  <div
                    key={item.menuItem._id as string}
                    className="flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {item.menuItem.name}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">
                        Qty: {item.quantity}
                      </span>
                    </div>
                    <span className="font-black text-gray-900 dark:text-white">
                      ₹{(item.menuItem.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-800 mt-6 pt-6 flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                    Order Total
                  </span>
                  <p className="text-4xl font-black text-indigo-600">₹{total.toFixed(2)}</p>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                    Table
                  </span>
                  <p className="text-xl font-black text-gray-900 dark:text-white">#{tableNumber}</p>
                </div>
              </div>
            </div>

            {/* Customer Info Mini-display */}
            {(customerName || notes) && (
              <div className="mb-8 px-4 py-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                {customerName && (
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1">
                    <span className="text-indigo-500">For:</span> {customerName}
                  </p>
                )}
                {notes && (
                  <p className="text-xs text-gray-500 italic flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">Note:</span> {notes}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={isLoading}
              className="w-full bg-gray-900 dark:bg-indigo-600 text-white font-black py-5 rounded-[2rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200 dark:shadow-none flex items-center justify-center gap-3 text-xl group"
            >
              <span>Place Order Now</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-center text-xs text-gray-400 mt-6 font-bold uppercase tracking-widest">
              Pay at the counter after eating
            </p>
          </div>
        )}

        {/* ─── PROCESSING VIEW ─── */}
        {view === "processing" && (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">
              Sending to Kitchen
            </h3>
            <p className="text-gray-500 font-medium">
              We're letting our chefs know you're hungry!
            </p>
          </div>
        )}

        {/* ─── SUCCESS VIEW ─── */}
        {view === "success" && (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-8 shadow-inner shadow-green-200">
              <CheckCircle2 className="w-12 h-12 text-green-500 drop-shadow-sm" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-4">
              Order Placed! 🎉
            </h3>
            <p className="text-gray-500 font-medium text-lg mb-8">
               Sit back and relax! Your delicious meal is being prepared.
            </p>
            
            <div className="w-full bg-gray-50 dark:bg-gray-900 rounded-3xl p-6 mb-8 border border-gray-100 dark:border-gray-800 text-left">
              <div className="flex justify-between py-1">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Order ID</span>
                <span className="font-mono text-xs text-gray-900 dark:text-white font-bold">#{successOrderId.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Payment Status</span>
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Pay Later</span>
              </div>
            </div>

            <button
              onClick={handleSuccessClose}
              className="w-full py-5 rounded-[2rem] bg-green-500 hover:bg-green-600 text-white font-black text-lg transition-all shadow-xl shadow-green-100 dark:shadow-none hover:scale-105 active:scale-95"
            >
              Track Order Status
            </button>
          </div>
        )}

        {/* ─── FAILED VIEW ─── */}
        {view === "failed" && (
          <div className="p-10 flex flex-col items-center text-center">
             <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-8">
              <X className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-4">
              Order Failed
            </h3>
            <p className="text-gray-500 font-medium mb-8">
              {errorMsg || "Something went wrong while placing your order."}
            </p>
            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={() => setView("confirm")}
                className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black transition-all"
              >
                Try Again
              </button>
              <button
                onClick={handleFailedClose}
                className="w-full py-4 rounded-2xl border-2 border-gray-100 text-gray-400 font-black hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
