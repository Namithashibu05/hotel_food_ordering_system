"use client";

import Link from "next/link";

import { ThemeToggle } from "./ThemeToggle";
import { UtensilsCrossed, ShoppingBag, Clock, Receipt } from "lucide-react";

export default function Header({
  cartCount = 0,
  openCart,
  tableNumber,
}: {
  cartCount?: number;
  openCart?: () => void;
  tableNumber?: string;
}) {

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href={`/?table=${tableNumber}`} className="flex items-center space-x-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-foreground hidden sm:inline-block">
              Hotel Delish <span className="text-primary">- Fine Dining</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          {tableNumber && (
            <>
              <Link 
                href={`/order-status?table=${tableNumber}`}
                className="flex items-center gap-1.5 px-2 py-2 sm:px-4 sm:gap-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden md:inline">Track Order</span>
              </Link>
              <Link 
                href={`/bill?table=${tableNumber}`}
                className="flex items-center gap-1.5 px-2 py-2 sm:px-4 sm:gap-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden md:inline">View Bill</span>
              </Link>
            </>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 border-l border-border pl-2 sm:pl-3">
            <ThemeToggle />
            {openCart && (
              <button
                onClick={openCart}
                className="group flex items-center justify-center p-2 rounded-xl hover:bg-primary/10 transition-all relative"
              >
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-foreground group-hover:text-primary transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-primary text-[9px] sm:text-[10px] font-black text-primary-foreground ring-2 ring-background">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
