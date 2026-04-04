"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Header from "@/components/Header";
import MenuCard from "@/components/MenuCard";
import CartSidebar, { CartItem } from "@/components/CartSidebar";
import ItemDetailModal from "@/components/ItemDetailModal";
import MenuCardSkeleton from "@/components/MenuCardSkeleton";
import Footer from "@/components/Footer";
import OrderConfirmationModal from "@/components/OrderConfirmationModal";
import { MenuItem } from "@/types";
import GameZone from "@/components/GameZone";
import CompensationModal from "@/components/CompensationModal";
import { ShoppingBag } from "lucide-react";


function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table") || "1";

  // Core shop state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [cart, setCart] = useState<CartItem[]>([]); // Array of {menuItem, quantity}
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");
  // Search query states for real-time list and debounced grid update
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] =
    useState<MenuItem | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentCustomerName, setPaymentCustomerName] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [compensationNote, setCompensationNote] = useState("");
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Pagination & Loading States
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Column detection for responsive trigger
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280)
        setColumns(4); // xl
      else if (window.innerWidth >= 1024)
        setColumns(3); // lg
      else if (window.innerWidth >= 640)
        setColumns(2); // sm
      else setColumns(1);
    };
    handleResize(); // Init
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const limit = 8;
  const observer = useRef<IntersectionObserver | null>(null);

  /**
   * Infinite scroll observer logic.
   * Tracks the visibility of the 'last' element in the grid and triggers a 
   * page increment when the user reaches the bottom.
   */
  const lastMenuItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            setPage((prevPage) => prevPage + 1);
          }
        },
        { rootMargin: "100px" },
      );
      if (node) observer.current.observe(node);
    },
    [loading, hasMore],
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  // Generate or retrieve table session ID — isolates each new group of customers
  useEffect(() => {
    const key = `table_session_${tableNumber}`;
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = `${tableNumber}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(key, sid);
    }
    setSessionId(sid);
  }, [tableNumber]);

  // Fetch menu when page or filters change
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchMenu = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          category: selectedCategory,
          veg: vegFilter,
          search: debouncedSearch,
        });

        const res = await fetch(`/api/menu/list?${queryParams}`, { signal });
        if (res.ok) {
          const data = await res.json();
          setMenuItems((prev) => {
            // If page 1, replace.
            if (page === 1) return data.items;
            // Else append unique items
            const existingIds = new Set(prev.map((i) => i._id));
            const newItems = data.items.filter(
              (i: MenuItem) => !existingIds.has(i._id as string),
            );
            return [...prev, ...newItems];
          });
          setHasMore(data.hasMore);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch menu", error);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    };

    fetchMenu();

    return () => {
      controller.abort();
    };
  }, [page, selectedCategory, vegFilter]);
  
  // Polling for compensations even on menu
  useEffect(() => {
    if (!sessionId) return;

    const checkCompensations = async () => {
      try {
        const params = new URLSearchParams({ tableNumber, sessionId });
        const res = await fetch(`/api/orders?${params}`);
        if (res.ok) {
           const orders = await res.json();
           const fresh = orders.find((o: any) => {
             if (!o.isDelayedCompensationApplied) return false;
             return !localStorage.getItem(`seen_comp_${o._id}`);
           });

           if (fresh) {
              setCompensationNote(fresh.compensationNote || "A special benefit has been added for you.");
              setIsCompModalOpen(true);
              localStorage.setItem(`seen_comp_${fresh._id}`, "true");
           }
        }
      } catch (err) {
        console.error("Comp polling err", err);
      }
    };

    const interval = setInterval(checkCompensations, 30000); // 30s is enough for menu
    checkCompensations(); // Initial check
    return () => clearInterval(interval);
  }, [sessionId, tableNumber]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    // Logic note: check dependencies to ensure we don't double fetch.
    // The main fetch effect depends on [page, selectedCategory, vegFilter]
    // Changing selectedCategory/vegFilter triggers that effect.
    // Setting page to 1 triggers it AGAIN if page was not 1.
    // If page was 1, it runs once (because categories changed).
    // If page was 2, setPage(1) queues update. effect runs for category change. effect runs for page change.
    // However, react might batch these or we might get 2 requests.
    // It's acceptable for now given the complexity of perfect debouncing here.
  }, [selectedCategory, vegFilter, debouncedSearch]);

  // Real-time search result list for the "box"
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const searchItems = async () => {
        try {
          const res = await fetch(`/api/menu/list?page=1&limit=5&search=${searchQuery}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.items);
            setShowResults(true);
          }
        } catch (error) {
          console.error("Search failed", error);
        }
      };
      const timer = setTimeout(searchItems, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  // Debounce search input for main grid
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside search listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/menu/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const seedData = async () => {
    setInitialLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || "Failed to seed");

      // Reset and reload
      setPage(1);
      setHasMore(true);
      const queryParams = new URLSearchParams({
        page: "1",
        limit: limit.toString(),
        category: selectedCategory,
        veg: vegFilter,
      });
      const menuRes = await fetch(`/api/menu/list?${queryParams}`);
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setMenuItems(menuData.items);
        setHasMore(menuData.hasMore);
      }
      await fetchCategories();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to seed data: ${error.message}`);
    } finally {
      setInitialLoading(false);
    }
  };

  const addToCart = (item: MenuItem, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem._id === item._id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem._id === item._id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { menuItem: item, quantity: quantity }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart((prev) =>
      prev.map((i) =>
        i.menuItem._id === itemId ? { ...i, quantity: newQuantity } : i,
      ),
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItem._id !== itemId));
  };

  const handleProceedToPayment = (customerName: string, notes: string) => {
    setPaymentCustomerName(customerName);
    setPaymentNotes(notes);
    setIsCartOpen(false);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = (orderId: string) => {
    toast.success("🎉 Your order is confirmed! Sent to kitchen.");
    setCart([]);
    setIsPaymentOpen(false);
    router.push(`/order-status?table=${tableNumber}`);
  };

  const handlePaymentFailure = (error: string) => {
    toast.error(`Payment failed: ${error}`);
    setIsPaymentOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      <Header
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
        openCart={() => setIsCartOpen(true)}
        tableNumber={tableNumber}
      />

      {/* Floating Stock Toggle for Quick View */}
      <button 
        onClick={() => setIsStockModalOpen(true)}
        className="fixed bottom-28 right-6 z-40 bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 group border-2 border-white/20"
      >
        <div className="relative">
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-emerald-600 rounded-full animate-ping"></span>
        </div>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-black whitespace-nowrap text-xs uppercase tracking-widest">
          Live Stock
        </span>
      </button>

      <main className="container mx-auto px-4 py-6 sm:py-8 flex-1">
        {/* Category Tabs & Veg Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div 
            ref={searchRef}
            className="flex-1 sm:max-w-sm w-full relative group"
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onFocus={() => searchQuery.length > 1 && setShowResults(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-card border border-border focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm"
              />
              <svg 
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Results Box */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="p-2 border-b border-border bg-muted/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Suggestions</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item._id as string}
                      onClick={() => {
                        setSelectedItemForModal(item);
                        setShowResults(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 transition-colors text-left border-b border-border/50 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.price}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-500" : "bg-red-500"}`} />
                    </button>
                  ))}
                </div>
                <div className="p-2 bg-muted/20 text-center">
                   <button 
                    onClick={() => setShowResults(false)}
                    className="text-[10px] font-bold text-primary hover:underline"
                   >
                     Show all results
                   </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2 border border-border rounded-full p-1 bg-card self-center sm:self-auto">
            <button
              onClick={() => setVegFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                vegFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setVegFilter("veg")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                vegFilter === "veg"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Veg
            </button>
            <button
              onClick={() => setVegFilter("non-veg")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                vegFilter === "non-veg"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Non-Veg
            </button>
          </div>
        </div>

        {initialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <MenuCardSkeleton key={i} />
            ))}
          </div>
        ) : menuItems.length === 0 && !loading ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              No menu items found
            </h2>
            <button
              onClick={seedData}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md"
            >
              Load Sample Menu
            </button>
          </div>
        ) : (
          <>
            {debouncedSearch && (
              <div className="mb-4 p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-2">
                 <span className="text-sm font-medium text-muted-foreground italic">
                   Showing results for: 
                 </span>
                 <span className="text-sm font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                   {debouncedSearch}
                 </span>
                 <button 
                  onClick={() => setSearchQuery("")}
                  className="ml-auto text-xs text-primary hover:underline font-bold"
                 >
                   Clear Search
                 </button>
              </div>
            )}
            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {menuItems.map((item, index) => {
                // Trigger fetch when we are at the very last item
                const isTrigger = index === menuItems.length - 1;

                return (
                  <MenuCard
                    ref={isTrigger ? lastMenuItemRef : null}
                    key={item._id as string}
                    item={item}
                    onAdd={addToCart}
                    onViewDetail={setSelectedItemForModal}
                  />
                );
              })}
            </div>
            {/* Loading Indicator for Infinite Scroll */}
            {loading && !initialLoading && (
              <div className="col-span-full flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onProceedToPayment={handleProceedToPayment}
        isOrdering={ordering}
      />

      <ItemDetailModal
        item={selectedItemForModal}
        isOpen={!!selectedItemForModal}
        onClose={() => setSelectedItemForModal(null)}
        onAddToCart={addToCart}
      />

      <OrderConfirmationModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        cart={cart}
        tableNumber={tableNumber}
        customerName={paymentCustomerName}
        notes={paymentNotes}
        sessionId={sessionId}
        onOrderSuccess={handlePaymentSuccess}
        onOrderFailure={handlePaymentFailure}
      />
      
      <GameZone />
      <CompensationModal 
        isOpen={isCompModalOpen} 
        onClose={() => setIsCompModalOpen(false)} 
        note={compensationNote} 
      />

      {/* Stock Availability Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-4 flex justify-between items-center border-b border-border">
              <div>
                <h3 className="text-2xl font-black text-foreground tracking-tight">Available Today</h3>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Fresh from the kitchen</p>
              </div>
              <button 
                onClick={() => setIsStockModalOpen(false)}
                className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all font-black"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {menuItems.filter(i => i.isAvailable).length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Refreshing stock list...</p>
                </div>
              ) : (
                menuItems.filter(i => i.isAvailable).map((item) => (
                  <div 
                    key={item._id as string}
                    className="flex items-center gap-4 p-3 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-500" : "bg-red-500"}`}></span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">₹{item.price}</p>
                      <button 
                        onClick={() => {
                          addToCart(item);
                          setIsStockModalOpen(false);
                        }}
                        className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-700 mt-1"
                      >
                        + Quick Add
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-muted/10 border-t border-border">
               <button 
                onClick={() => setIsStockModalOpen(false)}
                className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl"
               >
                 Close & Browse Menu
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Loading Application...
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
