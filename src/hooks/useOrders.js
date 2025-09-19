import moment from "moment";
import { useState, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, get, push, child, remove } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

export const useOrders = () => {
  const [orders, setOrders] = useState([]);

  const loadOrdersFromStorage = useCallback((setLoading) => {
    const ordersRef = ref(database, 'orders');
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const ordersArray = Object.values(data);
        setOrders(ordersArray);
      } else {
        setOrders([]);
      }
      if(setLoading) setLoading(false);
    }, (error) => {
      console.error("Failed to load orders from Firebase", error);
      if(setLoading) setLoading(false);
    });
  }, []);

  const saveOrdersToStorage = useCallback((newOrders) => {
    const ordersRef = ref(database, 'orders');
    const ordersObject = newOrders.reduce((acc, order) => {
      const id = order.id || uuidv4();
      acc[id] = { ...order, id };
      return acc;
    }, {});
    set(ordersRef, ordersObject).catch(error => {
      console.error("Failed to save orders to Firebase", error);
    });
  }, []);

  const deleteOrdersFromStorage = useCallback(async (orderIds) => {
    const ordersRef = ref(database, 'orders');
    const snapshot = await get(ordersRef);
    const ordersData = snapshot.val();
    if (ordersData) {
      const updates = {};
      orderIds.forEach(id => {
        // Firebase can't use number keys, so we need to find the key by id
        const orderKey = Object.keys(ordersData).find(key => ordersData[key].id === id);
        if (orderKey) {
          updates[orderKey] = null;
        }
      });
      if (Object.keys(updates).length > 0) {
        const updatedOrders = { ...ordersData, ...updates };
        // We need to remove null keys before setting
        Object.keys(updatedOrders).forEach(key => {
            if (updatedOrders[key] === null) {
                delete updatedOrders[key];
            }
        });
        await set(ref(database, 'orders'), updatedOrders);
      }
    }
  }, []);

  const updateOrdersForStore = useCallback((storeId, storeOrders, storeData) => {
    const processedOrders = storeOrders.map(order => ({
      ...order,
      store_name: storeData.name,
      store_id: storeData.id,
      store_url: storeData.url
    }));

    get(ref(database, 'orders')).then(snapshot => {
      const existingOrders = snapshot.val() || {};
      const otherStoresOrders = {};
      Object.values(existingOrders).forEach(order => {
        if (order.store_id !== storeId) {
          otherStoresOrders[order.id] = order;
        }
      });

      const newStoreOrdersObject = processedOrders.reduce((acc, order) => {
        acc[order.id] = order;
        return acc;
      }, {});

      const updatedOrders = { ...otherStoresOrders, ...newStoreOrdersObject };
      set(ref(database, 'orders'), updatedOrders);
    });
  }, []);

  const addImportedOrders = useCallback((importedOrders) => {
    get(ref(database, 'orders')).then(snapshot => {
      const existingOrders = snapshot.val() || {};
      const importedOrdersObject = importedOrders.reduce((acc, order) => {
        const id = order.id || uuidv4();
        acc[id] = { ...order, id };
        return acc;
      }, {});
      const updatedOrders = { ...existingOrders, ...importedOrdersObject };
      set(ref(database, 'orders'), updatedOrders);
    });
  }, []);

  const moveWhatsAppOrder = useCallback(async (waOrder) => {
    const ordersRef = ref(database, 'orders');
    const newOrderRef = push(ordersRef);
    // const newId = newOrderRef.key;
    const newId = `${waOrder.ref.replace(/^([A-Za-z]{2})[A-Za-z0-9]*-.*([0-9]{2}).*$/, "$1$2")}`+Math.floor(10000 + Math.random() * 90000);
    const nameParts = (waOrder.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    let dateCreated = new Date().toISOString();
    if (waOrder.date && waOrder.date !== '---') {
      const dateParts = waOrder.date.split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        let year = parseInt(dateParts[2], 10);
        if (year < 100) {
          year += 2000;
        }
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          dateCreated = new Date(year, month, day).toISOString();
        }
      }
    }

    const totalValue = waOrder.totalPayment || waOrder.price || '0';
    const totalNumber = parseFloat(String(totalValue).replace(/[^0-9.]/g, '')) || 0;
    
    const isValidNote = (field) => {
      const value = waOrder[field]?.trim();
      return !!(value && !/^[-\s]+$/.test(value));
    };
    const extractNumber = (str) => {
      let empty = !/^[-\s]+$/.test(str)
      if (!str || !empty) return null;
      const num = parseInt(str.replace(/\D/g, ""), 10);
      return isNaN(num) ? null : num;
    };
    const finalAmount = (extractNumber(waOrder.totalPayment) || extractNumber(waOrder.price)).toString();
    
    const newOrder = {
      id: newId,
      store_id: 'whatsapp-order',
      store_name: 'WhatsApp',
      // date_created: dateCreated,
      date_created: moment().format("YYYY-MM-DDTHH:mm:ss"),
      status: 'processing',
      billing: {
        first_name: waOrder.name,
        last_name: "",
        address_1: waOrder.address,
        city: waOrder.city,
        phone: waOrder.mobile,
      },
      shipping: {},
      line_items: [{
        id: uuidv4(),
        name: waOrder.items,
        quantity: 1,
        // total: totalNumber.toString()
        total: finalAmount
      }],
      // customer_note: `Special Note: ${waOrder.note}\nImportant Note: ${waOrder.importantNote}`,
      customer_note: isValidNote("note") ? `${waOrder.note.trim()}` : (isValidNote("importantNote") ? `${waOrder.importantNote.trim()}` : 'N/A'),
      payment_method_title: 'Manual Order',
      // total: totalNumber.toString(),
      total: finalAmount,
      currency: 'AED',
    };
    
    console.log(newOrder);

    await set(child(ordersRef, newId), newOrder);
  }, []);


  return { orders, setOrders, loadOrdersFromStorage, saveOrdersToStorage, deleteOrdersFromStorage, updateOrdersForStore, addImportedOrders, moveWhatsAppOrder };
};
  