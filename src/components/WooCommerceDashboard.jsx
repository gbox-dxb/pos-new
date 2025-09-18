import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useStores } from '@/hooks/useStores';
import { useOrders } from '@/hooks/useOrders';
import { syncAllStores, exportOrdersToExcel, updateOrderStatusBatch, updateOrderDetails, importOrdersFromExcel, deleteOrdersPermanentlyBatch } from '@/lib/woocommerce';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardTabs from '@/components/DashboardTabs';
import StoreConnectionModal from '@/components/StoreConnectionModal';
import APISettings from '@/components/APISettings';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { database } from '@/lib/firebase';
import { ref, update, onValue, set } from 'firebase/database';
import { useAccessControl } from '@/contexts/AccessControlContext';
import { ShieldAlert } from 'lucide-react';


const defaultScreenOptions = {
    itemsPerPage: 20,
    visibleColumns: {
        order: true,
        date: true,
        status: true,
        billing: true,
        shipping: true,
        items: true,
        payment: true,
        total: true,
        actions: true,
    }
};

const defaultTabOrder = ["orders", "trashed", "stock", "stores", "products", "whatsapp", "tracking", "access-manager"];

const MainDashboard = ({
  stores,
  sortedOrders,
  filteredOrders,
  trashedOrders,
  loading,
  screenOptions,
  selectedRows,
  handleSync,
  handleOpenStoreModal,
  handleExport,
  handleImport,
  setFilteredOrders,
  handleScreenOptionsChange,
  deleteStore,
  handleUpdateOrders,
  isUpdatingOrders,
  handleUpdateOrderDetails,
  isUpdatingDetails,
  setSelectedRows,
  revenueString,
  activeTab,
  setActiveTab,
  handleMoveWhatsAppOrder,
  handleUpdateWhatsAppOrder,
  handleTrashSelectedOrders,
  handleDeletePermanently,
  tabOrder,
  setTabOrder,
}) => {
  const { permissions, loading: accessLoading } = useAccessControl();

  if (accessLoading || !permissions) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        onAddStore={() => handleOpenStoreModal()}
        onSync={handleSync}
        onExport={handleExport}
        onImport={handleImport}
        loading={loading}
        storesCount={stores.length}
        ordersCount={filteredOrders.length}
        revenueString={revenueString}
        activeTab={activeTab}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6"
      >
        <DashboardTabs
          stores={stores}
          orders={filteredOrders}
          trashedOrders={trashedOrders}
          loading={loading}
          onSync={handleSync}
          onAddStore={() => handleOpenStoreModal()}
          onEditStore={handleOpenStoreModal}
          onDeleteStore={deleteStore}
          onUpdateOrders={handleUpdateOrders}
          isUpdatingOrders={isUpdatingOrders}
          onUpdateOrderDetails={handleUpdateOrderDetails}
          isUpdatingDetails={isUpdatingDetails}
          screenOptions={screenOptions}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onMoveWhatsAppOrder={handleMoveWhatsAppOrder}
          onUpdateWhatsAppOrder={handleUpdateWhatsAppOrder}
          onTrashSelectedOrders={handleTrashSelectedOrders}
          onDeletePermanently={handleDeletePermanently}
          tabOrder={tabOrder}
          setTabOrder={setTabOrder}
          sortedOrders={sortedOrders}
          setFilteredOrders={setFilteredOrders}
          onScreenOptionsChange={handleScreenOptionsChange}
        />
      </motion.div>
    </>
  );
};


const WooCommerceDashboardComponent = () => {
  const { stores, addStore, updateStore, deleteStore, loadStoresFromStorage } = useStores();
  const { orders, loadOrdersFromStorage, saveOrdersToStorage, deleteOrdersFromStorage, addImportedOrders, moveWhatsAppOrder, updateOrdersForStore } = useOrders();
  
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingOrders, setIsUpdatingOrders] = useState(false);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [activeTab, setActiveTab] = useState("orders");
  const [screenOptions, setScreenOptions] = useState(defaultScreenOptions);
  const [tabOrder, setTabOrder] = useState(defaultTabOrder);
  
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const { permissions, isAdmin } = useAccessControl();

  useEffect(() => {
    setLoading(true);
    const screenOptionsRef = ref(database, 'settings/screenOptions');
    const tabOrderRef = ref(database, 'settings/tabOrder');

    const screenOptionsUnsubscribe = onValue(screenOptionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setScreenOptions(data);
      }
    });

    const tabOrderUnsubscribe = onValue(tabOrderRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTabOrder(data);
      } else {
        set(tabOrderRef, defaultTabOrder);
      }
    });

    loadStoresFromStorage(setLoading);
    loadOrdersFromStorage(setLoading);

    return () => {
      screenOptionsUnsubscribe();
      tabOrderUnsubscribe();
    };
  }, [loadStoresFromStorage, loadOrdersFromStorage]);

  useEffect(() => {
    if (isAdmin) {
      const tabOrderRef = ref(database, 'settings/tabOrder');
      set(tabOrderRef, tabOrder);
    }
  }, [tabOrder, isAdmin]);

  useEffect(() => {
    if (permissions) {
      const firstVisibleTab = tabOrder.find(tabId => permissions.tabs[tabId] && permissions.tabs[tabId] !== 'none');
      if (firstVisibleTab) {
        setActiveTab(firstVisibleTab);
      } else {
        setActiveTab(''); // No tabs are visible
      }
    }
  }, [permissions, tabOrder]);
  
  const { activeOrders, trashedOrders } = useMemo(() => {
    const active = [];
    const trashed = [];
    orders.forEach(order => {
      if (order.status === 'trash') {
        trashed.push(order);
      } else {
        active.push(order);
      }
    });
    return { activeOrders: active, trashedOrders: trashed };
  }, [orders]);

  const sortedOrders = useMemo(() => {
      return [...activeOrders].sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
  }, [activeOrders]);

  const revenueString = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const currencies = [...new Set(filteredOrders.map(o => o.currency))];
    if (currencies.length === 1 && currencies[0]) {
      return totalRevenue.toLocaleString('en-US', { style: 'currency', currency: currencies[0], minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `${totalRevenue.toLocaleString('en-US', { currency: 'AED', style: 'currency', minimumFractionDigits: 2, maximumFractionDigits: 2 })} (mixed)`;
  }, [filteredOrders]);


  useEffect(() => {
    setFilteredOrders(sortedOrders);
    setSelectedRows(new Set());
  }, [sortedOrders]);

  const handleScreenOptionsChange = (key, value) => {
    const newOptions = { ...screenOptions, [key]: value };
    setScreenOptions(newOptions);
    if (isAdmin) {
      const screenOptionsRef = ref(database, 'settings/screenOptions');
      set(screenOptionsRef, newOptions);
    }
  };

  const handleOpenStoreModal = (store = null) => {
    if (!permissions.addStore) return;
    setEditingStore(store);
    setShowStoreModal(true);
  };
  
  const handleCloseStoreModal = () => {
    setEditingStore(null);
    setShowStoreModal(false);
  };

  const handleSaveStore = (storeData) => {
    if (!permissions.addStore) return;
    if (editingStore) {
      updateStore(editingStore.id, storeData);
    } else {
      addStore(storeData);
    }
    handleCloseStoreModal();
  };
  
  const handleSync = async (storeId = null) => {
    if (!permissions.syncOrders) return;
    setLoading(true);
    await syncAllStores({
      storeId,
      stores,
      updateOrdersForStore,
      updateStore,
      toast,
    });
    setLoading(false);
  };

  const handleExport = () => {
    if (!permissions.importExport) return;
    if (activeTab === 'stock') {
      toast({ title: "Please use the export button inside the Stock Manager tab." });
      return;
    }
    if (activeTab === 'whatsapp') {
      document.dispatchEvent(new CustomEvent('exportWhatsAppOrders'));
      return;
    }

    let ordersToExport;
    const sourceOrders = activeTab === 'trashed' ? trashedOrders : sortedOrders;

    if (selectedRows.size > 0) {
      const selectedOrderKeys = Array.from(selectedRows);
      ordersToExport = sourceOrders.filter(order => selectedOrderKeys.includes(`${order.store_id}-${order.id}`));
    } else {
      ordersToExport = activeTab === 'trashed' ? trashedOrders : filteredOrders;
    }
    
    exportOrdersToExcel(ordersToExport, screenOptions.visibleColumns, toast);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (activeTab === 'stock') {
        toast({ title: "Please use the import button inside the Stock Manager tab." });
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
    }

    if (activeTab === 'whatsapp') {
      document.dispatchEvent(new CustomEvent('importWhatsAppOrders', { detail: file }));
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setLoading(true);
    try {
        const createdOrders = await importOrdersFromExcel(file, stores, toast);
        if (createdOrders && createdOrders.length > 0) {
            addImportedOrders(createdOrders);
        }
    } catch (error) {
        toast({
            title: "Import Failed",
            description: error.message || "An unexpected error occurred during import.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const handleImportClick = () => {
    if (!permissions.importExport) return;
    if (activeTab === 'stock') {
        toast({ title: "Please use the import button inside the Stock Manager tab." });
        return;
    }
    if (activeTab === 'orders' && stores.length === 0) {
        toast({
            title: "Cannot Import",
            description: "Please add at least one store before importing orders.",
            variant: "destructive",
        });
        return;
    }
    fileInputRef.current?.click();
  };

  const handleUpdateOrders = async (ordersToUpdate, newStatus) => {
    setIsUpdatingOrders(true);
    await updateOrderStatusBatch({
        ordersToUpdate,
        newStatus,
        stores,
        toast,
    });

    const updatedOrderIds = new Set(ordersToUpdate.map(o => o.id));
    const newOrders = orders.map(order => {
        if (updatedOrderIds.has(order.id)) {
            return { ...order, status: newStatus };
        }
        return order;
    });

    saveOrdersToStorage(newOrders);
    setSelectedRows(new Set());
    setIsUpdatingOrders(false);
  };

  const handleTrashSelectedOrders = async () => {
    if (selectedRows.size === 0) return;
    setIsUpdatingOrders(true);

    const ordersToTrash = orders.filter(o => selectedRows.has(`${o.store_id}-${o.id}`));
    
    await handleUpdateOrders(ordersToTrash, 'trash');

    toast({
        title: "Orders Trashed",
        description: `${ordersToTrash.length} order(s) have been moved to trash.`,
    });

    setSelectedRows(new Set());
    setIsUpdatingOrders(false);
  };

  const handleDeletePermanently = async () => {
    if (selectedRows.size === 0) return;
    setIsUpdatingOrders(true);

    const ordersToDelete = trashedOrders.filter(o => selectedRows.has(`${o.store_id}-${o.id}`));
    
    const { successCount } = await deleteOrdersPermanentlyBatch({
      ordersToDelete,
      stores,
      toast,
    });

    if (successCount > 0) {
      const deletedOrderIds = new Set(ordersToDelete.map(o => o.id));
      await deleteOrdersFromStorage(Array.from(deletedOrderIds));
    }

    setSelectedRows(new Set());
    setIsUpdatingOrders(false);
  };

  const handleUpdateOrderDetails = async (storeId, orderId, data) => {
    setIsUpdatingDetails(true);
    try {
        if (storeId === 'whatsapp-order') {
          const orderRef = ref(database, `orders/${orderId}`);
          await update(orderRef, data);
        } else {
          const updatedOrder = await updateOrderDetails({
              storeId,
              orderId,
              data,
              stores,
              toast,
          });

          const newOrders = orders.map(order => {
              if (order.id === orderId) {
                  return { ...order, ...updatedOrder };
              }
              return order;
          });
          saveOrdersToStorage(newOrders);
        }
    } catch(error) {
        console.error("Update failed from dashboard:", error);
        throw error; 
    } finally {
        setIsUpdatingDetails(false);
    }
  };

  const handleUpdateWhatsAppOrder = async (orderId, data) => {
    const orderRef = ref(database, `whatsapp_orders/${orderId}`);
    try {
      await update(orderRef, data);
    } catch (error) {
      console.error("Failed to update WhatsApp order:", error);
      toast({ title: 'Update Failed', variant: 'destructive'});
      throw error;
    }
  };
  
  const handleMoveWhatsAppOrder = async (waOrder) => {
      await moveWhatsAppOrder(waOrder);
  };

  return (
    <div className="min-h-screen w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls, .csv"
      />
      <div className="absolute top-4 right-4 z-50">
        <ThemeSwitcher />
      </div>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <MainDashboard
            stores={stores}
            sortedOrders={sortedOrders}
            filteredOrders={filteredOrders}
            trashedOrders={trashedOrders}
            loading={loading}
            screenOptions={screenOptions}
            selectedRows={selectedRows}
            handleSync={handleSync}
            handleOpenStoreModal={handleOpenStoreModal}
            handleExport={handleExport}
            handleImport={handleImportClick}
            setFilteredOrders={setFilteredOrders}
            handleScreenOptionsChange={handleScreenOptionsChange}
            deleteStore={deleteStore}
            handleUpdateOrders={handleUpdateOrders}
            isUpdatingOrders={isUpdatingOrders}
            handleUpdateOrderDetails={handleUpdateOrderDetails}
            isUpdatingDetails={isUpdatingDetails}
            setSelectedRows={setSelectedRows}
            revenueString={revenueString}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleMoveWhatsAppOrder={handleMoveWhatsAppOrder}
            handleUpdateWhatsAppOrder={handleUpdateWhatsAppOrder}
            handleTrashSelectedOrders={handleTrashSelectedOrders}
            handleDeletePermanently={handleDeletePermanently}
            tabOrder={tabOrder}
            setTabOrder={setTabOrder}
        />
      </div>

      <StoreConnectionModal
        isOpen={showStoreModal}
        onClose={handleCloseStoreModal}
        onSaveStore={handleSaveStore}
        store={editingStore}
      />
    </div>
  );
};

const WooCommerceDashboard = () => {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/api-settings" element={<APISettings />} />
      <Route path="*" element={<WooCommerceDashboardComponent />} />
    </Routes>
  );
};

export default WooCommerceDashboard;