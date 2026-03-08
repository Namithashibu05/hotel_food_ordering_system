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
import { MenuItem } from "@/types";

function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table") || "1";

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [ordering, setOrdering] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] =
    useState<MenuItem | null>(null);

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
  }, [selectedCategory, vegFilter]);

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

  const placeOrder = async (customerName: string, notes: string) => {
    setOrdering(true);
    try {
      const orderData = {
        tableNumber,
        customerName,
        items: cart.map((i) => ({
          menuItem: i.menuItem._id,
          name: i.menuItem.name,
          price: i.menuItem.price,
          quantity: i.quantity,
          notes,
        })),
        totalAmount: cart.reduce(
          (acc, i) => acc + i.menuItem.price * i.quantity,
          0,
        ),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        toast.success("Order placed successfully!");
        setCart([]);
        setIsCartOpen(false);
        router.push(`/order-status?table=${tableNumber}`);
      } else {
        toast.error("Failed to place order.");
      }
    } catch (error) {
      console.error("Order error", error);
      toast.error("Error placing order.");
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      <Header
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
        openCart={() => setIsCartOpen(true)}
        tableNumber={tableNumber}
      />

      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Category Tabs & Veg Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide w-full sm:w-auto">
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

          <div className="flex items-center gap-2 border border-border rounded-full p-1 bg-card">
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
        onPlaceOrder={placeOrder}
        isOrdering={ordering}
      />

      <ItemDetailModal
        item={selectedItemForModal}
        isOpen={!!selectedItemForModal}
        onClose={() => setSelectedItemForModal(null)}
        onAddToCart={addToCart}
      />
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
