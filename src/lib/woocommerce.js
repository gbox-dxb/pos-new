import moment from "moment";

import { toast } from '@/components/ui/use-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const CORS_PROXY_URL = 'https://app-cors.vercel.app/api/proxy?url=';

export const testStoreConnection = async (storeData) => {
  const auth = btoa(`${storeData.consumerKey}:${storeData.consumerSecret}`);
  const endpoint = `${storeData.url.replace(/\/$/, '')}/wp-json/wc/v3/system_status`;
  const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;

  const response = await fetch(proxyUrl, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
};


export const syncStoreOrders = async (store, updateOrdersForStore) => {
  const auth = btoa(`${store.consumerKey}:${store.consumerSecret}`);
  const endpoint = `${store.url.replace(/\/$/, '')}/wp-json/wc/v3/orders?per_page=100`;
  const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;

  const response = await fetch(proxyUrl, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const storeOrders = await response.json();
  updateOrdersForStore(store.id, storeOrders, store);
};

export const syncAllStores = async ({ storeId, stores, updateOrdersForStore, updateStore, toast }) => {
  let syncedCount = 0;

  const storesToSync = storeId ? stores.filter(s => s.id === storeId) : stores;

  if (storesToSync.length === 0 && !storeId) {
    toast({
      title: "No Stores to Sync",
      description: "Please add a store first.",
      variant: "destructive"
    });
    return;
  }

  for (const store of storesToSync) {
    try {
      await syncStoreOrders(store, updateOrdersForStore);
      updateStore(store.id, { connected: true, lastSync: new Date().toISOString() });
      syncedCount++;
    } catch (e) {
      updateStore(store.id, { connected: false });
      console.error(`Failed to sync store: ${store.name}`, e);
      toast({
        title: `Sync Error for ${store.name}`,
        description: "Could not retrieve orders. Please check credentials and connection.",
        variant: "destructive"
      });
    }
  }

  if (syncedCount > 0) {
    toast({
      title: "Orders Synced Successfully!",
      description: `Retrieved orders from ${syncedCount} store(s).`
    });
  }
};

export const updateOrderStatusBatch = async ({ ordersToUpdate, newStatus, stores, toast }) => {
  const ordersByStore = ordersToUpdate.reduce((acc, order) => {
    (acc[order.store_id] = acc[order.store_id] || []).push({ id: order.id, status: newStatus });
    return acc;
  }, {});

  let successCount = 0;
  let errorCount = 0;

  for (const storeId in ordersByStore) {
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      toast({
        title: 'Update Error',
        description: `Could not find store with ID ${storeId}.`,
        variant: 'destructive',
      });
      errorCount += ordersByStore[storeId].length;
      continue;
    }

    try {
      const auth = btoa(`${store.consumerKey}:${store.consumerSecret}`);
      const endpoint = `${store.url.replace(/\/$/, '')}/wp-json/wc/v3/orders/batch`;
      const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ update: ordersByStore[storeId] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Batch update request failed.');
      }

      successCount += ordersByStore[storeId].length;

    } catch (error) {
      console.error(`Failed to update orders for store ${store.name}:`, error);
      toast({
        title: `Update Failed for ${store.name}`,
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
      errorCount += ordersByStore[storeId].length;
    }
  }

  if (successCount > 0) {
    toast({
      title: 'Update Successful!',
      description: `${successCount} order(s) have been updated to "${newStatus}".`,
    });
  }

  if (errorCount > 0) {
    toast({
      title: 'Some Updates Failed',
      description: `${errorCount} order(s) could not be updated. See console for details.`,
      variant: 'destructive'
    });
  }
};

export const deleteOrdersPermanentlyBatch = async ({ ordersToDelete, stores, toast }) => {
    const ordersByStore = ordersToDelete.reduce((acc, order) => {
        (acc[order.store_id] = acc[order.store_id] || []).push(order.id);
        return acc;
    }, {});

    let successCount = 0;
    let errorCount = 0;

    for (const storeId in ordersByStore) {
        const store = stores.find(s => s.id === storeId);
        if (!store) {
            toast({
                title: 'Delete Error',
                description: `Could not find store with ID ${storeId}.`,
                variant: 'destructive',
            });
            errorCount += ordersByStore[storeId].length;
            continue;
        }

        try {
            const auth = btoa(`${store.consumerKey}:${store.consumerSecret}`);
            const orderIds = ordersByStore[storeId];
            
            // WooCommerce API requires force=true to permanently delete
            const endpoint = `${store.url.replace(/\/$/, '')}/wp-json/wc/v3/orders?force=true&id=${orderIds.join(',')}`;
            const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;

            // The batch endpoint for DELETE does not support force=true, so we must delete one by one or use a query param.
            // Using a query param is more efficient if the API supports it. Let's assume it doesn't and do it one by one.
            for (const orderId of orderIds) {
                const singleEndpoint = `${store.url.replace(/\/$/, '')}/wp-json/wc/v3/orders/${orderId}?force=true`;
                const singleProxyUrl = `${CORS_PROXY_URL}${singleEndpoint}`;
                const response = await fetch(singleProxyUrl, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `Delete request failed for order ${orderId}.`);
                }
                successCount++;
            }

        } catch (error) {
            console.error(`Failed to delete orders for store ${store.name}:`, error);
            toast({
                title: `Delete Failed for ${store.name}`,
                description: error.message || 'An unknown error occurred.',
                variant: 'destructive',
            });
            errorCount += ordersByStore[storeId].length - successCount; // Adjust error count
        }
    }

    if (successCount > 0) {
        toast({
            title: 'Delete Successful!',
            description: `${successCount} order(s) have been permanently deleted.`,
        });
    }

    if (errorCount > 0) {
        toast({
            title: 'Some Deletions Failed',
            description: `${errorCount} order(s) could not be deleted. See console for details.`,
            variant: 'destructive'
        });
    }
    return { successCount, errorCount };
};

export const updateOrderDetails = async ({ storeId, orderId, data, stores, toast }) => {
  const store = stores.find(s => s.id === storeId);
  if (!store) {
    toast({
      title: 'Update Error',
      description: `Could not find store with ID ${storeId}.`,
      variant: 'destructive',
    });
    throw new Error('Store not found');
  }

  try {
    const auth = btoa(`${store.consumerKey}:${store.consumerSecret}`);
    const endpoint = `${store.url.replace(/\/$/, '')}/wp-json/wc/v3/orders/${orderId}`;
    const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;

    const response = await fetch(proxyUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Order update request failed.');
    }

    const updatedOrder = await response.json();

    toast({
      title: 'Update Successful!',
      description: `Order #${orderId} details have been updated.`,
    });

    return {
      ...updatedOrder,
      store_name: store.name,
      store_id: store.id,
      store_url: store.url
    };

  } catch (error) {
    console.error(`Failed to update order for store ${store.name}:`, error);
    toast({
      title: `Update Failed for ${store.name}`,
      description: error.message || 'An unknown error occurred.',
      variant: 'destructive',
    });
    throw error;
  }
};

const formatMobile = (input) => {
  if (input == null) return null;
  
  // 1. Convert to string
  let str = String(input);
  
  // 2. Remove all non-digits
  let digits = str.replace(/\D/g, "");
  
  // 3. Remove UAE country code if present
  if (digits.startsWith("971")) {
    digits = digits.slice(3);
  }
  
  // 4. Remove leading 0 if present
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  
  // 5. Return cleaned subscriber number
  return digits;
}

export const exportOrdersToExcel = (ordersToExport, visibleColumns, toast) => {
  if (!ordersToExport || ordersToExport.length === 0) {
    toast({
      title: "No Data to Export",
      description: "There are no orders to export.",
      variant: "destructive"
    });
    return;
  }

  const dataToExport = ordersToExport.map(order => {
    const billing = order.billing || {};
    const shipping = order.shipping || {};
    const row = {};

    // Always include store name for re-importing
    row['Store'] = order.store_name;
    if (visibleColumns.status) row['Status'] = order.status;
    
    const city = order?.meta_data?.find(item => item.key === '_billing_area')?.value || 'N/A';
    
    if (visibleColumns.billing) {
      row['Billing First Name'] = billing.first_name;
      row['Billing Last Name'] = billing.last_name;
      row['Billing Address 1'] = billing.address_1;
      row['Billing Phone'] = billing.phone;
      row['Billing Mobile'] = formatMobile(billing.phone);
      row['Billing City'] = billing.city || city;
      row['Billing Address 2'] = billing.address_2;
      row['Billing Country'] = 'United Arab Emirates' // billing.country;
      row['Payment Type'] = 'Cash'
    }
    
    if (visibleColumns.total) {
      row['Currency'] = order.currency;
      row['Total'] = order.total;
    }
    
    // added extra field
    row['Qty'] = 1;
    row['Weight'] = 0.5;
    row['Volume'] = 0;
    
    let ref;
    if (order.store_id === "whatsapp-order") {
      ref = order.id
    } else {
      ref = order.store_name.slice(-3) + '' + order.id
    }
    if (visibleColumns.ref) {
      row['Reference'] = ref;
    }
    
    if (visibleColumns.items) {
      if(order.store_id === "whatsapp-order") {
        row['Items'] = order.line_items?.map(item => `${item.name}`).join('\n') || '';
      } else {
        // ✅ Show quantity
        row['Items'] = order.line_items?.map(item => `(Qty: ${item.quantity})-${item.name}`).join('\n') || '';
      }
      
      row['Customer Note'] = order.customer_note;
    }
    
    row['Items Count'] = order.line_items?.length || 0;
    row['Current Date'] = moment().format("MMM DD, YYYY");
    row['Current Time'] = moment().format("hh:mm A");
    
    row['Store Name'] = order.store_name;
    
    if (visibleColumns.order) row['Order ID'] = order.id;
    if (visibleColumns.date) row['Date'] = new Date(order.date_created).toISOString();
    
    if (visibleColumns.billing) {
      row['Billing Company'] = billing.company;
      row['Billing Postcode'] = billing.postcode;
      row['Billing State'] = billing.state;
      row['Billing Email'] = billing.email;
    }
    
    if (visibleColumns.shipping) {
      row['Shipping First Name'] = shipping.first_name;
      row['Shipping Last Name'] = shipping.last_name;
      row['Shipping Company'] = shipping.company;
      row['Shipping Address 1'] = shipping.address_1;
      row['Shipping Address 2'] = shipping.address_2;
      row['Shipping City'] = shipping.city;
      row['Shipping Postcode'] = shipping.postcode;
      row['Shipping State'] = shipping.state;
      row['Shipping Country'] = shipping.country;
    }
    
    if (visibleColumns.payment) row['Payment Method'] = order.payment_method_title || order.payment_method;
    
    return row;
  });

  const csv = Papa.unparse(dataToExport);

  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `woocommerce-orders-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: "Export Successful!",
    description: `Exported ${ordersToExport.length} orders to CSV file.`
  });
};

export const importOrdersFromExcel = (file, stores, toast) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error("The selected file is empty or in the wrong format.");
        }

        const ordersByStore = json.reduce((acc, row) => {
          const storeName = row['Store'];
          if (!storeName) {
            console.warn('Skipping row due to missing store name:', row);
            return acc;
          }
          const store = stores.find(s => s.name.toLowerCase() === storeName.toLowerCase());
          if (!store) {
            console.warn(`Skipping row, store not found: "${storeName}"`);
            return acc;
          }

          const orderData = {
            payment_method: row['Payment Method'] || 'other',
            payment_method_title: row['Payment Method Title'] || 'Other',
            set_paid: row['Status'] === 'completed' || row['Status'] === 'processing',
            status: row['Status'] || 'pending',
            currency: row['Currency'] || 'USD',
            billing: {
              first_name: row['Billing First Name'],
              last_name: row['Billing Last Name'],
              address_1: row['Billing Address 1'],
              address_2: row['Billing Address 2'],
              city: row['Billing City'],
              state: row['Billing State'],
              postcode: row['Billing Postcode'],
              country: row['Billing Country'],
              email: row['Billing Email'],
              phone: row['Billing Phone'],
            },
            shipping: {
              first_name: row['Shipping First Name'] || row['Billing First Name'],
              last_name: row['Shipping Last Name'] || row['Billing Last Name'],
              address_1: row['Shipping Address 1'] || row['Billing Address 1'],
              address_2: row['Shipping Address 2'] || row['Billing Address 2'],
              city: row['Shipping City'] || row['Billing City'],
              state: row['Shipping State'] || row['Billing State'],
              postcode: row['Shipping Postcode'] || row['Billing Postcode'],
              country: row['Shipping Country'] || row['Billing Country'],
            },
            line_items: (row['Items'] || '').split(';').map(itemStr => {
              const match = itemStr.trim().match(/(\d+)x\s*(.*?)\s*\(SKU:\s*(.*?)\)/);
              if (!match) return null;
              return {
                product_id: null, // We can't know the product ID, but we can use name/SKU
                name: match[2],
                sku: match[3],
                quantity: parseInt(match[1], 10),
              };
            }).filter(Boolean),
            customer_note: row['Customer Note'],
          };

          if (!acc[store.id]) {
            acc[store.id] = { store, orders: [] };
          }
          acc[store.id].orders.push(orderData);
          return acc;
        }, {});

        let allCreatedOrders = [];
        let successCount = 0;
        let errorCount = 0;

        for (const storeId in ordersByStore) {
          const { store, orders } = ordersByStore[storeId];
          const auth = btoa(`${store.consumerKey}:${store.consumerSecret}`);
          const endpoint = `${store.url.replace(/\/$/, '')}/wp-json/wc/v3/orders/batch`;
          const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;

          try {
            const response = await fetch(proxyUrl, {
              method: 'POST',
              headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
              body: JSON.stringify({ create: orders }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Batch create request failed.');

            const createdOrders = (result.create || []).map(o => ({ ...o, store_name: store.name, store_id: store.id, store_url: store.url }));
            allCreatedOrders = allCreatedOrders.concat(createdOrders);
            successCount += createdOrders.length;
            if (result.create.length < orders.length) {
              errorCount += orders.length - result.create.length;
            }
          } catch (error) {
            errorCount += orders.length;
            console.error(`Failed to import orders for store ${store.name}:`, error);
            toast({
              title: `Import Failed for ${store.name}`,
              description: error.message || 'An unknown error occurred.',
              variant: 'destructive',
            });
          }
        }

        toast({
          title: "Import Complete",
          description: `Successfully created ${successCount} orders. Failed to create ${errorCount} orders.`,
        });

        resolve(allCreatedOrders);

      } catch (error) {
        console.error("Error processing file:", error);
        reject(new Error("Could not parse file. Make sure it's a valid Excel or CSV file."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const fetchAllProducts = async (stores, toast) => {
  let allProducts = [];
  for (const store of stores) {
    try {
      const auth = btoa(`${store.consumerKey}:${store.consumerSecret}`);
      const endpoint = `${store.url.replace(/\/$/, '')}/wp-json/wc/v3/products?per_page=100`;
      const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;

      const response = await fetch(proxyUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const storeProducts = await response.json();
      const productsWithStoreInfo = storeProducts.map(p => ({
        ...p,
        store_id: store.id,
        store_name: store.name,
      }));
      allProducts = [...allProducts, ...productsWithStoreInfo];
    } catch (e) {
      console.error(`Failed to fetch products for store: ${store.name}`, e);
      toast({
        title: `Product Fetch Error for ${store.name}`,
        description: "Could not retrieve products. Please check credentials and connection.",
        variant: "destructive"
      });
    }
  }
  return allProducts;
};

export const updateProductBatch = async ({ productsToUpdate, stores, toast }) => {
  const productsByStore = productsToUpdate.reduce((acc, product) => {
    const updateData = {
      id: product.id,
      name: product.name,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      stock_status: product.stock_status,
    };
    (acc[product.store_id] = acc[product.store_id] || []).push(updateData);
    return acc;
  }, {});

  let successCount = 0;
  let errorCount = 0;

  for (const storeId in productsByStore) {
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      errorCount += productsByStore[storeId].length;
      continue;
    }

    try {
      const auth = btoa(`${store.consumerKey}:${store.consumerSecret}`);
      const endpoint = `${store.url.replace(/\/$/, '')}/wp-json/wc/v3/products/batch`;
      const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ update: productsByStore[storeId] }),
      });

      if (!response.ok) throw new Error('Batch product update failed.');
      
      successCount += productsByStore[storeId].length;
    } catch (error) {
      console.error(`Failed to update products for store ${store.name}:`, error);
      errorCount += productsByStore[storeId].length;
    }
  }

  if (successCount > 0) {
    toast({
      title: 'Update Successful!',
      description: `${successCount} product(s) have been updated.`,
    });
  }
  if (errorCount > 0) {
    toast({
      title: 'Some Updates Failed',
      description: `${errorCount} product(s) could not be updated.`,
      variant: 'destructive',
    });
  }
};

export const deleteProductBatch = async ({ productsToDelete, stores, toast }) => {
  const productsByStore = productsToDelete.reduce((acc, product) => {
    (acc[product.store_id] = acc[product.store_id] || []).push(product.id);
    return acc;
  }, {});

  let successCount = 0;
  let errorCount = 0;

  for (const storeId in productsByStore) {
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      errorCount += productsByStore[storeId].length;
      continue;
    }

    try {
      const auth = btoa(`${store.consumerKey}:${store.consumerSecret}`);
      const endpoint = `${store.url.replace(/\/$/, '')}/wp-json/wc/v3/products/batch`;
      const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ delete: productsByStore[storeId] }),
      });

      if (!response.ok) throw new Error('Batch product delete failed.');
      
      successCount += productsByStore[storeId].length;
    } catch (error) {
      console.error(`Failed to delete products for store ${store.name}:`, error);
      errorCount += productsByStore[storeId].length;
    }
  }

  if (successCount > 0) {
    toast({
      title: 'Delete Successful!',
      description: `${successCount} product(s) have been deleted.`,
    });
  }
  if (errorCount > 0) {
    toast({
      title: 'Some Deletions Failed',
      description: `${errorCount} product(s) could not be deleted.`,
      variant: 'destructive',
    });
  }
};

export const exportProductsToExcel = (productsToExport, toast) => {
  if (!productsToExport || productsToExport.length === 0) {
    toast({
      title: "No Data to Export",
      description: "There are no products to export.",
      variant: "destructive"
    });
    return;
  }

  const dataToExport = productsToExport.map(product => {
    const flatProduct = { ...product };
    
    // Flatten complex objects for better readability in Excel
    if (product.images && product.images.length > 0) {
      flatProduct.image_url = product.images[0].src;
    }
    delete flatProduct.images;

    if (product.categories && product.categories.length > 0) {
      flatProduct.categories = product.categories.map(c => c.name).join(', ');
    }

    if (product.tags && product.tags.length > 0) {
      flatProduct.tags = product.tags.map(t => t.name).join(', ');
    }

    if (product.attributes && product.attributes.length > 0) {
      product.attributes.forEach((attr, index) => {
        flatProduct[`attribute_${index + 1}_name`] = attr.name;
        flatProduct[`attribute_${index + 1}_options`] = attr.options.join(', ');
      });
    }
    delete flatProduct.attributes;

    if (product.dimensions) {
      flatProduct.length = product.dimensions.length;
      flatProduct.width = product.dimensions.width;
      flatProduct.height = product.dimensions.height;
    }
    delete flatProduct.dimensions;

    delete flatProduct._links;
    delete flatProduct.meta_data;

    return flatProduct;
  });

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
  XLSX.writeFile(workbook, `woocommerce-products-${new Date().toISOString().split('T')[0]}.xlsx`);

  toast({
    title: "Export Successful!",
    description: `Exported ${productsToExport.length} products with full details.`
  });
};

export const importProductsFromExcel = (file, stores, toast) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error("The selected file is empty or in the wrong format.");
        }

        const productsToUpdate = json.map(row => {
            const store = stores.find(s => s.name === row['store_name']);
            if (!store) {
                console.warn(`Skipping product, store not found: "${row['store_name']}"`);
                return null;
            }
            return {
                id: row['id'],
                name: row['name'],
                regular_price: row['regular_price'],
                sale_price: row['sale_price'],
                stock_status: row['stock_status'],
                store_id: store.id,
            };
        }).filter(Boolean);

        if (productsToUpdate.length > 0) {
            await updateProductBatch({ productsToUpdate, stores, toast });
        } else {
            toast({ title: "Import Warning", description: "No valid products found to update.", variant: "destructive" });
        }
        
        resolve();

      } catch (error) {
        console.error("Error processing file:", error);
        reject(new Error("Could not parse file. Make sure it's a valid Excel or CSV file."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
  