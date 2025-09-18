import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove, get } from 'firebase/database';

export const useStores = () => {
  const [stores, setStores] = useState([]);
  const { toast } = useToast();

  const loadStoresFromStorage = useCallback((setLoading) => {
    const storesRef = ref(database, 'stores');
    onValue(storesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const storesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setStores(storesArray);
      } else {
        setStores([]);
      }
      if(setLoading) setLoading(false);
    }, (error) => {
      console.error("Failed to load stores from Firebase", error);
      if(setLoading) setLoading(false);
    });
  }, []);

  const addStore = useCallback((storeData) => {
    const storesRef = ref(database, 'stores');
    const newStoreRef = push(storesRef);
    const newStore = {
      ...storeData,
      id: newStoreRef.key,
      connected: true,
      lastSync: null
    };
    set(newStoreRef, newStore).then(() => {
      toast({
        title: "Store Added!",
        description: `${storeData.name} has been successfully added.`
      });
    });
  }, [toast]);

  const updateStore = useCallback(async (storeId, updates) => {
    const storeRef = ref(database, `stores/${storeId}`);
    const snapshot = await get(storeRef);
    const existingStore = snapshot.val();
    set(storeRef, { ...existingStore, ...updates }).then(() => {
      toast({
        title: "Store Updated!",
        description: `Your store details have been saved.`
      });
    });
  }, [toast]);

  const deleteStore = useCallback(async (storeId) => {
    const storeToDelete = stores.find(s => s.id === storeId);
    if (!storeToDelete) return;

    const storeRef = ref(database, `stores/${storeId}`);
    await remove(storeRef);

    const ordersRef = ref(database, 'orders');
    const snapshot = await get(ordersRef);
    const ordersData = snapshot.val();
    if (ordersData) {
      const updates = {};
      Object.keys(ordersData).forEach(orderKey => {
        if (ordersData[orderKey].store_id === storeId) {
          updates[orderKey] = null;
        }
      });
      if (Object.keys(updates).length > 0) {
        await set(ref(database, 'orders'), { ...ordersData, ...updates });
      }
    }

    toast({
      title: "Store Deleted",
      description: `${storeToDelete.name} has been removed.`,
      variant: "destructive"
    });
  }, [stores, toast]);

  return { stores, setStores, loadStoresFromStorage, addStore, updateStore, deleteStore };
};