"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ChevronDown, Plus, Minus, Trash2, Edit3, Camera, X } from "lucide-react";

interface OrderItem {
  menuItem: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  _id: string;
  tableNumber: string;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
  estimatedPrepTime: number;
}

export default function AdminDashboard() {
  const router = useRouter();

  // Basic UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedTable, setSelectedTable] = useState<string>("all");

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [prevOrderIds, setPrevOrderIds] = useState<string[]>([]);

  // Menu Management State
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [menuFormData, setMenuFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    subCategory: "",
    image: "",
    isAvailable: true,
    isVeg: true,
    spiceLevel: "Nil" as "Nil" | "Mild" | "Medium" | "Hot",
    prepTime: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Inline editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");
  const [editingPrepId, setEditingPrepId] = useState<string | null>(null);
  const [editingPrepValue, setEditingPrepValue] = useState<string>("");

  // Kitchen module state
  const [kitchenFilter, setKitchenFilter] = useState<string>("active");
  const [kitchenSort, setKitchenSort] = useState<string>("oldest");
  const [selectedKitchenOrder, setSelectedKitchenOrder] = useState<Order | null>(null);
  const [kitchenNow, setKitchenNow] = useState<Date>(new Date());
  const [kitchenNotifications, setKitchenNotifications] = useState<string[]>([]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Kitchen live clock & delay alert every minute
  useEffect(() => {
    const tick = setInterval(() => setKitchenNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  // Detect new orders and notify
  useEffect(() => {
    const currentIds = orders.map((o) => o._id);
    const newOnes = currentIds.filter((id) => !prevOrderIds.includes(id));
    if (prevOrderIds.length > 0 && newOnes.length > 0) {
      const msg = `🆕 ${newOnes.length} new order${newOnes.length > 1 ? "s" : ""} received!`;
      setKitchenNotifications((prev) => [msg, ...prev].slice(0, 5));
      toast.success(msg, { duration: 4000 });
    }
    setPrevOrderIds(currentIds);
  }, [orders]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const updateOrderPrepTime = async (id: string, newTime: number) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimatedPrepTime: newTime }),
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o._id === id ? updatedOrder : o));
        if (selectedKitchenOrder?._id === id) {
          setSelectedKitchenOrder(updatedOrder);
        }
        toast.success(`Prep time updated to ${newTime}m`);
      }
    } catch (error) {
      console.error("Failed to update prep time:", error);
      toast.error("Fixed time update failed");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  // Handle image upload with progress
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);

    // Create preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

      if (!API_KEY || API_KEY === "your_imgbb_api_key_here") {
        toast.error(
          "Please configure NEXT_PUBLIC_IMGBB_API_KEY in .env.local file. Get a free API key from https://api.imgbb.com/",
        );
        setUploadingImage(false);
        return;
      }

      const formData = new FormData();
      formData.append("image", file);

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.imgbb.com/1/upload?key=${API_KEY}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            setMenuFormData((prev) => ({ ...prev, image: data.data.url }));
            toast.success("Image uploaded successfully!");
          } else {
            toast.error(
              "Upload failed: " + (data.error?.message || "Unknown error"),
            );
          }
        } else {
          toast.error("Upload failed with status " + xhr.status);
        }
        setUploadingImage(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        console.error("Image upload error");
        toast.error("Failed to upload image. Please try again.");
        setUploadingImage(false);
        setUploadProgress(0);
      };

      xhr.send(formData);
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    }
  };

  // Fetch menu items
  const fetchMenuItems = async () => {
    try {
      const res = await fetch(`/api/menu?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    }
  };

  useEffect(() => {
    if (activeSection === "menu") {
      fetchMenuItems();
    }
  }, [activeSection]);

  // Handle menu form submission
  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicates
    if (!editingItem) {
      const duplicate = menuItems.find(
        (item) => item.name.toLowerCase() === menuFormData.name.toLowerCase(),
      );
      if (duplicate) {
        toast.error("A menu item with this name already exists!");
        return;
      }
    }
    if (!menuFormData.price || isNaN(parseFloat(menuFormData.price))) {
      toast.error("Please enter a valid price");
      return;
    }
    if (!menuFormData.prepTime || isNaN(parseInt(menuFormData.prepTime))) {
      toast.error("Please enter a valid preparation time");
      return;
    }

    try {
      const method = editingItem ? "PUT" : "POST";
      const body = {
        _id: editingItem?._id,
        name: menuFormData.name,
        description: menuFormData.description,
        price: parseFloat(menuFormData.price),
        category: menuFormData.category,
        subCategory: menuFormData.subCategory,
        image: menuFormData.image,
        isAvailable: menuFormData.isAvailable,
        isVeg: menuFormData.isVeg,
        spiceLevel: menuFormData.spiceLevel,
        prepTime: parseInt(menuFormData.prepTime),
      };

      const res = await fetch("/api/menu", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(
          editingItem
            ? "Menu item updated successfully!"
            : "Menu item added successfully!",
        );
        fetchMenuItems();
        setShowMenuModal(false);
        resetMenuForm();
      } else {
        toast.error("Failed to save menu item");
      }
    } catch (error) {
      console.error("Menu save error:", error);
      toast.error("Error saving menu item");
    }
  };

  // Reset menu form
  const resetMenuForm = () => {
    setMenuFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      subCategory: "",
      image: "",
      isAvailable: true,
      isVeg: true,
      spiceLevel: "Nil",
      prepTime: "",
    });
    setEditingItem(null);
    setImagePreview("");
  };

  // Edit menu item
  const handleEditMenuItem = (item: any) => {
    setEditingItem(item);
    setMenuFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      subCategory: item.subCategory || "",
      image: item.image || "",
      isAvailable: item.isAvailable,
      isVeg: item.isVeg,
      spiceLevel: item.spiceLevel || "Nil",
      prepTime: item.prepTime ? item.prepTime.toString() : "",
    });
    setImagePreview(item.image || "");
    setShowMenuModal(true);
  };

  // Delete menu item
  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;

    try {
      const res = await fetch(`/api/menu?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchMenuItems();
        toast.success("Menu item deleted successfully!");
      } else {
        toast.error("Failed to delete menu item");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Error deleting menu item");
    }
  };

  // Save inline price edit
  const saveInlinePrice = async (item: any) => {
    const newPrice = parseFloat(editingPriceValue);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Please enter a valid price");
      setEditingPriceId(null);
      return;
    }
    try {
      // Optimistic update
      setMenuItems(prev => prev.map(i => i._id === item._id ? { ...i, price: newPrice } : i));

      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: item._id, price: newPrice, image: item.image }),
      });
      if (res.ok) {
        toast.success("Price updated!");
        fetchMenuItems();
      } else {
        fetchMenuItems(); // Rollback/Refresh on error
        toast.error("Failed to update price");
      }
    } catch (error) {
      fetchMenuItems(); // Rollback/Refresh on error
      console.error("Price update error:", error);
      toast.error("Error updating price");
    } finally {
      setEditingPriceId(null);
    }
  };

  // Save inline prep time edit
  const saveInlinePrep = async (item: any) => {
    const newPrep = parseInt(editingPrepValue);
    if (isNaN(newPrep) || newPrep < 1) {
      toast.error("Please enter a valid preparation time");
      setEditingPrepId(null);
      return;
    }
    try {
      // Optimistic update
      setMenuItems(prev => prev.map(i => i._id === item._id ? { ...i, prepTime: newPrep } : i));

      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: item._id, prepTime: newPrep, image: item.image }),
      });
      if (res.ok) {
        toast.success("Prep time updated!");
        fetchMenuItems();
      } else {
        fetchMenuItems(); // Rollback/Refresh on error
        toast.error("Failed to update prep time");
      }
    } catch (error) {
      fetchMenuItems(); // Rollback/Refresh on error
      console.error("Prep time update error:", error);
      toast.error("Error updating prep time");
    } finally {
      setEditingPrepId(null);
    }
  };

  // Toggle availability
  const toggleAvailability = async (item: any) => {
    try {
      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, isAvailable: !item.isAvailable }),
      });

      if (res.ok) {
        fetchMenuItems();
      }
    } catch (error) {
      console.error("Toggle availability error:", error);
    }
  };

  const navigationItems = [
    { id: "dashboard", name: "Dashboard", icon: "📊" },
    { id: "orders", name: "Orders", icon: "🛒", badge: orders.length },
    { id: "menu", name: "Menu Management", icon: "🍽️" },
    { id: "kitchen", name: "Kitchen", icon: "👨‍🍳" },
    { id: "billing", name: "Billing", icon: "💳" },
    { id: "reports", name: "Reports", icon: "📈" },
    { id: "settings", name: "Settings", icon: "⚙️" },
  ];

  // Get unique table numbers from orders
  const uniqueTables = Array.from(
    new Set(orders.map((order) => order.tableNumber)),
  ).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    return numA - numB;
  });

  // Filter orders based on selected table
  const filteredOrders =
    selectedTable === "all"
      ? orders
      : orders.filter((order) => order.tableNumber === selectedTable);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-border transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"
          } flex flex-col`}
        style={{ minHeight: "100vh" }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Restaurant Management
                </p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="Toggle sidebar"
            >
              <span className="text-lg">{sidebarOpen ? "◀" : "▶"}</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeSection === item.id
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left text-sm">{item.name}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`${activeSection === item.id ? "bg-background text-foreground" : "bg-primary text-primary-foreground"} text-xs font-bold px-2 py-0.5 rounded-full`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
          >
            <span className="text-lg">🚪</span>
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navigation Bar */}
        <nav className="bg-white border-b border-border">
          <div className="px-6 py-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {navigationItems.find((item) => item.id === activeSection)
                    ?.name || "Dashboard"}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    Administrator
                  </p>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  A
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto bg-background">
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Table Selector */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Filter by Table
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      View orders for specific tables
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">
                      Table:
                    </label>
                    <div className="relative group">
                      <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none text-sm font-bold transition-all cursor-pointer"
                      >
                        <option value="all">All Tables</option>
                        {uniqueTables.map((table) => (
                          <option key={table} value={table}>
                            Table #{table}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                    </div>
                    {selectedTable !== "all" && (
                      <button
                        onClick={() => setSelectedTable("all")}
                        className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-muted text-foreground text-sm font-medium transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        Total Orders
                      </p>
                      <p className="text-3xl font-black text-primary mt-1">
                        {filteredOrders.length}
                      </p>
                      {selectedTable !== "all" && (
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                          Table #{selectedTable}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-2xl">
                      📦
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        Active Orders
                      </p>
                      <p className="text-3xl font-black text-orange-600 mt-1">
                        {
                          filteredOrders.filter(
                            (o) =>
                              !["Delivered", "Cancelled"].includes(o.status),
                          ).length
                        }
                      </p>
                      {selectedTable !== "all" && (
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                          Table #{selectedTable}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-2xl">
                      🔥
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        {selectedTable === "all"
                          ? "Revenue Today"
                          : "Table Revenue"}
                      </p>
                      <p className="text-3xl font-black text-green-700 mt-1">
                        ₹
                        {filteredOrders
                          .reduce((sum, o) => sum + o.totalAmount, 0)
                          .toFixed(2)}
                      </p>
                      {selectedTable !== "all" && (
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                          Table #{selectedTable}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-2xl">
                      💰
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        Avg Order Value
                      </p>
                      <p className="text-3xl font-black text-primary mt-1">
                        ₹
                        {filteredOrders.length > 0
                          ? (
                            filteredOrders.reduce(
                              (sum, o) => sum + o.totalAmount,
                              0,
                            ) / filteredOrders.length
                          ).toFixed(2)
                          : "0.00"}
                      </p>
                      {selectedTable !== "all" && (
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                          Table #{selectedTable}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-2xl">
                      📊
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders Section */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  {selectedTable === "all"
                    ? "Recent Orders"
                    : `Orders for Table #${selectedTable}`}
                </h2>
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="text-gray-500 text-sm">
                      {selectedTable === "all"
                        ? "No active orders found."
                        : `No orders found for Table #${selectedTable}.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredOrders.map((order) => (
                      <div
                        key={order._id}
                        className="border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors"
                      >
                        <div className="bg-muted/30 px-4 py-3 flex justify-between items-center border-b border-border">
                          <h3 className="text-sm font-semibold text-gray-900">
                            Table #{order.tableNumber}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === "Delivered"
                              ? "bg-green-100 text-green-800"
                              : order.status === "Cancelled"
                                ? "bg-red-100 text-red-800"
                                : order.status === "Preparing"
                                  ? "bg-orange-100 text-orange-800"
                                  : order.status === "Ready"
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : "bg-indigo-100 text-indigo-800"
                              }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          {order.customerName && (
                            <p className="text-xs text-gray-600 mb-2">
                              <span className="font-medium text-gray-900">
                                {order.customerName}
                              </span>
                            </p>
                          )}
                          <div className="border-t border-b border-border py-2 my-2 space-y-2">
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-xs"
                              >
                                <span className="text-gray-700">
                                  <span className="font-semibold">
                                    {item.quantity}×
                                  </span>{" "}
                                  {item.name}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between font-semibold text-gray-900 mt-2 text-sm">
                            <span>Total:</span>
                            <span>₹{order.totalAmount.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-muted/30 px-4 py-3 border-t border-border">
                          <div className="relative group/select">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                updateStatus(order._id, e.target.value)
                              }
                              className="appearance-none block w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-4 pr-10 text-[11px] font-black uppercase tracking-wider focus:border-primary focus:outline-none transition-all cursor-pointer"
                            >
                              <option value="Pending">🕒 Pending</option>
                              <option value="Confirmed">✅ Confirmed</option>
                              <option value="Preparing">👨‍🍳 Preparing</option>
                              <option value="Ready">🛎️ Ready</option>
                              <option value="Delivered">🚚 Delivered</option>
                              <option value="Cancelled">❌ Cancelled</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover/select:text-primary transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "menu" && (
            <div className="space-y-4">
              {/* Menu Header */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Menu Management
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Add, edit, delete, and manage menu items
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      resetMenuForm();
                      setShowMenuModal(true);
                    }}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all text-sm"
                  >
                    + Add New Dish
                  </button>
                </div>
              </div>

              {/* Menu Items Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {menuItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">🍽️</div>
                    <p className="text-gray-500 text-sm">
                      No menu items found. Add your first dish!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            Category
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            Spice
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            Prep Time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {menuItems.map((item) => (
                          <tr
                            key={item._id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {item.name}
                                </p>
                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                  {item.description}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {editingPriceId === item._id ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  autoFocus
                                  value={editingPriceValue}
                                  onChange={(e) => setEditingPriceValue(e.target.value)}
                                  onBlur={() => saveInlinePrice(item)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveInlinePrice(item);
                                    if (e.key === "Escape") setEditingPriceId(null);
                                  }}
                                  className="w-24 px-2 py-1 border-2 border-primary rounded-lg text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingPriceId(item._id);
                                    setEditingPriceValue(item.price.toString());
                                  }}
                                  title="Click to edit price"
                                  className="group flex items-center gap-2 font-black text-gray-900 hover:text-primary transition-colors cursor-pointer"
                                >
                                  ₹{item.price.toFixed(2)}
                                  <Edit3 className="w-3 h-3 text-gray-300 group-hover:text-primary transition-colors" />
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${item.isVeg
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {item.isVeg ? "🥬 Veg" : "🍖 Non-Veg"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-700">
                                {item.spiceLevel || "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {editingPrepId === item._id ? (
                                <input
                                  type="number"
                                  min="1"
                                  autoFocus
                                  value={editingPrepValue}
                                  onChange={(e) => setEditingPrepValue(e.target.value)}
                                  onBlur={() => saveInlinePrep(item)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveInlinePrep(item);
                                    if (e.key === "Escape") setEditingPrepId(null);
                                  }}
                                  className="w-20 px-2 py-1 border-2 border-primary rounded-lg text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingPrepId(item._id);
                                    setEditingPrepValue(item.prepTime ? item.prepTime.toString() : "");
                                  }}
                                  title="Click to edit prep time"
                                  className="group flex items-center gap-2 text-sm font-black text-primary bg-primary/5 px-3 py-1.5 rounded-xl hover:bg-primary/10 transition-all cursor-pointer"
                                >
                                  ⏱ {item.prepTime || "N/A"}m
                                  <Edit3 className="w-3 h-3 text-primary/30 group-hover:text-primary transition-colors" />
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleAvailability(item)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${item.isAvailable
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                  }`}
                              >
                                {item.isAvailable
                                  ? "✓ Available"
                                  : "✗ Unavailable"}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditMenuItem(item)}
                                  className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteMenuItem(item._id)}
                                  className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "orders" && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Order Management
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Track and update all restaurant orders
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchOrders}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="Refresh"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Table
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Prep
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr
                          key={order._id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-4 text-xs font-mono text-gray-500">
                            #{order._id.slice(-6)}
                          </td>
                          <td className="px-4 py-4 font-bold text-gray-900">
                            Table {order.tableNumber}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {order.customerName || "Guest"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-gray-600 max-w-xs truncate">
                              {order.items
                                .map((i) => `${i.quantity}x ${i.name}`)
                                .join(", ")}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-bold text-[var(--deep-burgundy)]">
                            ₹{order.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="relative group/mini">
                              <select
                                value={order.status}
                                onChange={(e) =>
                                  updateStatus(order._id, e.target.value)
                                }
                                className={`appearance-none text-[10px] font-black uppercase tracking-widest pl-3 pr-8 py-1.5 rounded-lg border-2 transition-all cursor-pointer outline-none ${order.status === "Delivered"
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : order.status === "Cancelled"
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : "border-orange-200 bg-orange-50 text-orange-700"
                                  }`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Preparing">Preparing</option>
                                <option value="Ready">Ready</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {!["Delivered", "Cancelled"].includes(order.status) ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000) >= (order.estimatedPrepTime || 15)
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                                  }`}>
                                  ⏱ {Math.max(0, (order.estimatedPrepTime || 15) - Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000))}m
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Ready</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === "kitchen" && (() => {
            // Kitchen helper functions (scoped via IIFE)
            const kitchenStatuses = ["Pending", "Confirmed", "Preparing", "Ready"];
            const kitchenOrders = orders.filter((o) =>
              !["Delivered", "Cancelled"].includes(o.status)
            );

            const getElapsedMinutes = (createdAt: string) =>
              Math.floor((kitchenNow.getTime() - new Date(createdAt).getTime()) / 60000);

            const getRemainingMinutes = (order: Order) => {
              const elapsed = getElapsedMinutes(order.createdAt);
              return (order.estimatedPrepTime || 15) - elapsed;
            };

            const getDelayLevel = (order: Order) => {
              const remaining = getRemainingMinutes(order);
              if (remaining <= -10) return "critical";
              if (remaining <= 0) return "warning";
              return "normal";
            };

            const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
              Pending: { bg: "bg-amber-50/40 border-amber-200/50", text: "text-amber-600", dot: "bg-amber-400", label: "⏳ Pending" },
              Confirmed: { bg: "bg-sky-50/40 border-sky-200/50", text: "text-sky-600", dot: "bg-sky-400", label: "✅ Confirmed" },
              Preparing: { bg: "bg-orange-50/40 border-orange-200/50", text: "text-orange-600", dot: "bg-orange-400", label: "🍳 Preparing" },
              Ready: { bg: "bg-emerald-50/40 border-emerald-200/50", text: "text-emerald-600", dot: "bg-emerald-400", label: "🛎️ Ready" },
            };

            const nextStatus: Record<string, string> = {
              Pending: "Confirmed",
              Confirmed: "Preparing",
              Preparing: "Ready",
              Ready: "Delivered",
            };

            const nextStatusLabel: Record<string, string> = {
              Pending: "Confirm",
              Confirmed: "Start Preparing",
              Preparing: "Mark as Ready",
              Ready: "Mark Delivered",
            };

            const nextStatusColor: Record<string, string> = {
              Pending: "bg-sky-500 hover:bg-sky-600",
              Confirmed: "bg-orange-400 hover:bg-orange-500",
              Preparing: "bg-emerald-500 hover:bg-emerald-600",
              Ready: "bg-slate-600 hover:bg-slate-700",
            };

            let filteredKitchenOrders = kitchenFilter === "active"
              ? kitchenOrders
              : kitchenOrders.filter((o) => o.status === kitchenFilter);

            filteredKitchenOrders = [...filteredKitchenOrders].sort((a, b) => {
              if (kitchenSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              if (kitchenSort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              if (kitchenSort === "table") return parseInt(a.tableNumber) - parseInt(b.tableNumber);
              return 0;
            });

            const delayedCount = kitchenOrders.filter((o) => getElapsedMinutes(o.createdAt) >= 10).length;

            return (
              <div className="space-y-4">
                {/* Top stats bar */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "All Active", count: kitchenOrders.length, color: "bg-slate-50 border border-slate-200 text-slate-700", icon: "🍽️" },
                    { label: "Pending", count: kitchenOrders.filter(o => o.status === "Pending").length, color: "bg-amber-50 border border-amber-200 text-amber-700", icon: "⏳" },
                    { label: "Preparing", count: kitchenOrders.filter(o => o.status === "Preparing").length, color: "bg-orange-50 border border-orange-200 text-orange-700", icon: "🍳" },
                    { label: "Ready", count: kitchenOrders.filter(o => o.status === "Ready").length, color: "bg-emerald-50 border border-emerald-200 text-emerald-700", icon: "🛎️" },
                    { label: "⚠️ Delayed", count: delayedCount, color: delayedCount > 0 ? "bg-rose-50 border border-rose-200 text-rose-700 animate-pulse" : "bg-slate-50 border border-slate-100 text-slate-400", icon: "🚨" },
                  ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl p-4 flex items-center gap-3 ${stat.color} transition-all duration-300`}>
                      <span className="text-2xl">{stat.icon}</span>
                      <div>
                        <p className="text-2xl font-black leading-none">{stat.count}</p>
                        <p className="text-xs font-semibold opacity-80 mt-0.5">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notification banner */}
                {kitchenNotifications.length > 0 && (
                  <div className="bg-sky-500/90 text-white rounded-xl px-5 py-3 flex items-center justify-between shadow-sm">
                    <span className="font-semibold text-sm tracking-wide">{kitchenNotifications[0]}</span>
                    <button onClick={() => setKitchenNotifications([])} className="text-white/70 hover:text-white text-lg font-bold transition-colors">✕</button>
                  </div>
                )}

                {/* Filters & Sort */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {["active", "Pending", "Confirmed", "Preparing", "Ready"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setKitchenFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all ${kitchenFilter === f
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}
                      >
                        {f === "active" ? "🍽️ All Active" : f}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">Sort:</span>
                    <select
                      value={kitchenSort}
                      onChange={(e) => setKitchenSort(e.target.value)}
                      className="px-3 py-2 rounded-lg border-2 border-gray-200 text-sm font-semibold focus:border-gray-900 focus:outline-none"
                    >
                      <option value="oldest">⬆ Oldest First</option>
                      <option value="newest">⬇ Newest First</option>
                      <option value="table">🪑 By Table</option>
                    </select>
                    <button
                      onClick={fetchOrders}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-lg"
                      title="Refresh orders"
                    >🔄</button>
                  </div>
                </div>

                {/* Order Cards Grid */}
                {filteredKitchenOrders.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 py-20 text-center">
                    <div className="text-6xl mb-3">🍽️</div>
                    <p className="text-gray-500 text-lg font-semibold">No orders to display</p>
                    <p className="text-gray-400 text-sm mt-1">New orders will appear here in real time</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredKitchenOrders.map((order) => {
                      const elapsed = getElapsedMinutes(order.createdAt);
                      const remaining = getRemainingMinutes(order);
                      const delay = getDelayLevel(order);
                      const cfg = statusConfig[order.status] || statusConfig["Pending"];
                      const isSelected = selectedKitchenOrder?._id === order._id;

                      const progress = Math.min(100, Math.max(0, (elapsed / (order.estimatedPrepTime || 15)) * 100));

                      return (
                        <div
                          key={order._id}
                          onClick={() => setSelectedKitchenOrder(isSelected ? null : order)}
                          className={`rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300 ${delay === "critical" ? "border-rose-300 shadow-rose-100 shadow-xl" :
                            delay === "warning" ? "border-orange-200 shadow-orange-50 shadow-lg" :
                              isSelected ? "border-slate-400 shadow-xl" : "border-slate-100/80 shadow-sm"
                            } ${isSelected ? "ring-4 ring-slate-400/10 scale-[1.02]" : "hover:shadow-md hover:scale-[1.01]"}`}
                        >
                          {/* Card Header */}
                          <div className={`px-5 py-3 flex items-center justify-between ${delay === "critical" ? "bg-rose-50 text-rose-900 border-b border-rose-100" :
                            delay === "warning" ? "bg-orange-50 text-orange-900 border-b border-orange-100" :
                              "bg-slate-50 text-slate-800 border-b border-slate-100"
                            }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black tracking-tight italic">T-{order.tableNumber}</span>
                              <span className="text-[10px] font-bold bg-white/60 border border-black/5 rounded-full px-2 py-0.5 text-gray-500 uppercase tracking-widest">#{order._id.slice(-5)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {remaining <= 0 ? (
                                <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full animate-pulse ${remaining <= -10 ? 'bg-rose-500 text-white' : 'bg-orange-500 text-white'}`}>
                                  {remaining <= -10 ? '🚨 CRITICAL' : '⚠️ DELAYED'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black tracking-widest bg-slate-900/5 text-slate-500 px-2.5 py-1 rounded-full border border-slate-900/5 uppercase">
                                  ⏱ {remaining}m left
                                </span>
                              )}
                              <div className="flex items-center gap-1 text-sm font-bold">
                                <span>{elapsed}m</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge & Progress */}
                          <div className={`px-5 py-2 border-b ${cfg.bg}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} inline-block`}></span>
                              <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
                              {order.customerName && (
                                <span className="ml-auto text-xs text-gray-500 font-medium">👤 {order.customerName}</span>
                              )}
                            </div>
                            <div className="w-full bg-black/5 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${remaining <= -10 ? 'bg-rose-400' : remaining <= 0 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Items */}
                          <div className="px-5 py-3 bg-white">
                            <ul className="space-y-2">
                              {order.items.map((item, idx) => (
                                <li key={idx} className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-xs font-black shrink-0 border border-slate-200">{item.quantity}</span>
                                    <span className="text-sm font-bold text-slate-700">{item.name}</span>
                                  </div>
                                  {item.notes && (
                                    <span className="text-xs text-orange-600 font-medium bg-orange-50 rounded-full px-2 py-0.5 shrink-0">📝 {item.notes}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                {(order as any).isDelayedCompensationApplied && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                    🎁 Compensation Applied
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-600">{order.items.length} {order.items.length === 1 ? "item" : "items"}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex gap-2" onClick={(e) => e.stopPropagation()}>
                            {nextStatus[order.status] && (
                              <button
                                onClick={() => updateStatus(order._id, nextStatus[order.status])}
                                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95 ${nextStatusColor[order.status]}`}
                              >
                                {nextStatusLabel[order.status]}
                              </button>
                            )}
                            <button
                              onClick={() => updateStatus(order._id, "Cancelled")}
                              className="px-3 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors"
                              title="Cancel order"
                            >✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Order Detail Drawer */}
                {selectedKitchenOrder && (() => {
                  const o = selectedKitchenOrder;
                  const elapsed = getElapsedMinutes(o.createdAt);
                  const remaining = getRemainingMinutes(o);
                  const delay = getDelayLevel(o);
                  const cfg = statusConfig[o.status] || statusConfig["Pending"];
                  return (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4" onClick={() => setSelectedKitchenOrder(null)}>
                      <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Drawer Header */}
                        <div className={`px-6 py-4 flex items-center justify-between ${delay === "critical" ? "bg-rose-50 text-rose-900 border-b border-rose-100" :
                          delay === "warning" ? "bg-orange-50 text-orange-900 border-b border-orange-100" :
                            "bg-slate-50 text-slate-800 border-b border-slate-100"
                          }`}>
                          <div>
                            <div className="flex items-center gap-3">
                              <h2 className="text-2xl font-black">Table {o.tableNumber}</h2>
                              <span className="bg-white/20 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">#{o._id.slice(-8)}</span>
                            </div>
                            <p className="text-sm opacity-75">Ordered {elapsed} min ago</p>
                          </div>
                          <button onClick={() => setSelectedKitchenOrder(null)} className="text-white/70 hover:text-white text-2xl">✕</button>
                        </div>

                        {/* Status strip */}
                        <div className={`px-6 py-3 flex items-center gap-3 ${cfg.bg} border-b`}>
                          <span className={`w-3 h-3 rounded-full ${cfg.dot}`}></span>
                          <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>

                          <div className="ml-auto flex items-center gap-4">
                            {/* Prep Time Adjustment */}
                            <div className="flex items-center gap-2 bg-white/40 rounded-lg px-2 py-1 border border-black/5">
                              <span className="text-[10px] font-black uppercase text-gray-500 mr-1">Time</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateOrderPrepTime(o._id, Math.max(1, (o.estimatedPrepTime || 15) - 5)); }}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white text-gray-600 hover:bg-gray-100 shadow-sm"
                              >-</button>
                              <span className="text-xs font-black min-w-[20px] text-center">{o.estimatedPrepTime || 15}m</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateOrderPrepTime(o._id, (o.estimatedPrepTime || 15) + 5); }}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white text-gray-600 hover:bg-gray-100 shadow-sm"
                              >+</button>
                            </div>

                            {remaining <= 0 ? (
                              <span className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-full animate-pulse ${remaining <= -10 ? 'bg-rose-500 text-white' : 'bg-orange-500 text-white'}`}>
                                {remaining <= -10 ? '🚨 CRITICAL' : '⚠️ DELAYED'} ({Math.abs(remaining)}m)
                              </span>
                            ) : (
                              <span className="text-xs font-black bg-white/50 text-gray-600 px-3 py-1 rounded-full border border-black/5">
                                ⏱ {remaining}m left
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="px-6 py-4">
                          {o.customerName && (
                            <p className="text-sm text-gray-500 mb-3">👤 <strong>{o.customerName}</strong></p>
                          )}
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Items</h3>
                          <ul className="space-y-3">
                            {o.items.map((item, idx) => (
                              <li key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-3">
                                  <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-900 text-white text-base font-black shrink-0">{item.quantity}×</span>
                                  <div className="flex-1">
                                    <p className="font-bold text-gray-800 text-base">{item.name}</p>
                                    {item.notes && (
                                      <p className="text-sm text-orange-600 mt-1">📝 {item.notes}</p>
                                    )}
                                  </div>
                                  <span className="text-sm font-bold text-gray-600">₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between font-black text-lg">
                            <span>Total</span>
                            <span>₹{o.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Quick action buttons */}
                        <div className="px-6 pb-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                          {nextStatus[o.status] && (
                            <button
                              onClick={() => { updateStatus(o._id, nextStatus[o.status]); setSelectedKitchenOrder(null); }}
                              className={`w-full py-4 rounded-xl text-white text-lg font-black transition-all active:scale-95 ${nextStatusColor[o.status]}`}
                            >
                              {nextStatusLabel[o.status]} →
                            </button>
                          )}
                          <button
                            onClick={() => { updateStatus(o._id, "Cancelled"); setSelectedKitchenOrder(null); }}
                            className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors"
                          >
                            ✕ Cancel Order
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {activeSection !== "dashboard" &&
            activeSection !== "menu" &&
            activeSection !== "orders" &&
            activeSection !== "kitchen" && (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <div className="text-6xl mb-4">
                  {
                    navigationItems.find((item) => item.id === activeSection)
                      ?.icon
                  }
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {
                    navigationItems.find((item) => item.id === activeSection)
                      ?.name
                  }
                </h2>
                <p className="text-gray-500">
                  This section is under development.
                </p>
              </div>
            )}
        </main>
      </div>

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-primary text-primary-foreground px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-lg">
                  {editingItem ? "✏️" : "✨"}
                </span>
                {editingItem ? "Edit Menu Item" : "Create New Dish"}
              </h3>
              <button
                onClick={() => {
                  setShowMenuModal(false);
                  resetMenuForm();
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMenuSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                    Dish Name
                  </label>
                  <input
                    type="text"
                    required
                    value={menuFormData.name}
                    onChange={(e) =>
                      setMenuFormData({ ...menuFormData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all placeholder:text-gray-300 font-medium"
                    placeholder="e.g., Signature Butter Chicken"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                    Description
                  </label>
                  <textarea
                    required
                    value={menuFormData.description}
                    onChange={(e) =>
                      setMenuFormData({
                        ...menuFormData,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all placeholder:text-gray-300 font-medium"
                    rows={3}
                    placeholder="Briefly describe the ingredients and taste..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                    Price (₹)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMenuFormData({ ...menuFormData, price: Math.max(0, (parseFloat(menuFormData.price) || 0) - 10).toString() })}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={menuFormData.price}
                      onChange={(e) =>
                        setMenuFormData({
                          ...menuFormData,
                          price: e.target.value,
                        })
                      }
                      className="flex-1 text-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all font-bold text-lg"
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => setMenuFormData({ ...menuFormData, price: ((parseFloat(menuFormData.price) || 0) + 10).toString() })}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                    Prep Time (mins)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMenuFormData({ ...menuFormData, prepTime: Math.max(1, (parseInt(menuFormData.prepTime) || 15) - 1).toString() })}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      required
                      min="1"
                      value={menuFormData.prepTime}
                      onChange={(e) =>
                        setMenuFormData({
                          ...menuFormData,
                          prepTime: e.target.value,
                        })
                      }
                      className="flex-1 text-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all font-bold text-lg"
                      placeholder="15"
                    />
                    <button
                      type="button"
                      onClick={() => setMenuFormData({ ...menuFormData, prepTime: ((parseInt(menuFormData.prepTime) || 15) + 1).toString() })}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                    Category
                  </label>
                  <div className="relative group">
                    <select
                      required
                      value={menuFormData.category}
                      onChange={(e) =>
                        setMenuFormData({
                          ...menuFormData,
                          category: e.target.value,
                        })
                      }
                      className="w-full appearance-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all font-medium cursor-pointer"
                    >
                      <option value="">Select category</option>
                      <option value="Starters">Starters</option>
                      <option value="Main Course">Main Course</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Breads">Breads</option>
                      <option value="Rice">Rice</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                    Sub Category
                  </label>
                  <input
                    type="text"
                    value={menuFormData.subCategory}
                    onChange={(e) =>
                      setMenuFormData({
                        ...menuFormData,
                        subCategory: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all placeholder:text-gray-300 font-medium"
                    placeholder="e.g., Spicy, Cold, Indian"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                    Spice Level
                  </label>
                  <div className="relative group">
                    <select
                      value={menuFormData.spiceLevel}
                      onChange={(e) =>
                        setMenuFormData({
                          ...menuFormData,
                          spiceLevel: e.target.value as "Nil" | "Mild" | "Medium" | "Hot",
                        })
                      }
                      className="w-full appearance-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all font-medium cursor-pointer"
                    >
                      <option value="Nil">🌿 Nil</option>
                      <option value="Mild">🌶️ Mild</option>
                      <option value="Medium">🌶️🌶️ Medium</option>
                      <option value="Hot">🌶️🌶️🌶️ Hot</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Image
                  </label>
                  <div className="flex items-center gap-4">
                    {imagePreview && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <div className="mt-2 w-full">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-primary">
                              Uploading...
                            </span>
                            <span className="text-xs font-semibold text-primary">
                              {uploadProgress}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-primary h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          Upload from your device
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-center text-gray-400 my-2">
                      -- OR --
                    </p>
                    <input
                      type="url"
                      value={menuFormData.image}
                      onChange={(e) =>
                        setMenuFormData({
                          ...menuFormData,
                          image: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
                      placeholder="Paste image URL here"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={menuFormData.isVeg}
                      onChange={(e) =>
                        setMenuFormData({
                          ...menuFormData,
                          isVeg: e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-primary rounded cursor-pointer"
                    />
                    <span className="text-sm font-black text-gray-600 uppercase tracking-widest group-hover:text-primary transition-colors">
                      🥬 Vegetarian
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={menuFormData.isAvailable}
                      onChange={(e) =>
                        setMenuFormData({
                          ...menuFormData,
                          isAvailable: e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-primary rounded cursor-pointer"
                    />
                    <span className="text-sm font-black text-gray-600 uppercase tracking-widest group-hover:text-primary transition-colors">
                      ✓ In Stock
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={uploadingImage || !menuFormData.image}
                  className={`flex-1 px-6 py-4 font-black uppercase tracking-widest text-sm rounded-xl transition-all duration-300 ${uploadingImage || !menuFormData.image
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-black shadow-[0_10px_20px_-10px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:translate-y-0"
                    }`}
                >
                  {uploadingImage
                    ? "⏳ Processing..."
                    : editingItem
                      ? "Save Changes"
                      : "Confirm & Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuModal(false);
                    resetMenuForm();
                  }}
                  className="px-8 py-4 bg-gray-100 text-gray-500 font-black uppercase tracking-widest text-sm rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
