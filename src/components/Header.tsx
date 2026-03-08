"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { UtensilsCrossed, ShoppingBag, Clock } from "lucide-react";

export default function Header({
  cartCount = 0,
  openCart,
  tableNumber,
}: {
  cartCount?: number;
  openCart?: () => void;
  tableNumber?: string;
}) {
  const router = useRouter();

  const handleTableChange = (newTable: string) => {
    router.push(`/?table=${newTable}`);
  };

  const tableOptions = Array.from({ length: 20 }, (_, i) => (i + 1).toString());

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href={`/?table=${tableNumber}`} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground hidden sm:inline-block">
              Hotel Food <span className="text-primary">Ordering System</span>
            </span>
          </Link>
          
          {tableNumber && (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full border border-border">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Table</span>
              <select
                value={tableNumber}
                onChange={(e) => handleTableChange(e.target.value)}
                className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer"
              >
                {tableOptions.map((table) => (
                  <option key={table} value={table} className="bg-background">
                     #{table}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {tableNumber && (
            <Link 
              href={`/order-status?table=${tableNumber}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Track Order</span>
            </Link>
          )}

          <div className="flex items-center gap-2 border-l border-border pl-3">
            <ThemeToggle />
            {openCart && (
              <button
                onClick={openCart}
                className="group flex items-center justify-center p-2 rounded-xl hover:bg-primary/10 transition-all relative"
              >
                <ShoppingBag className="w-6 h-6 text-foreground group-hover:text-primary transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground ring-2 ring-background">
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
