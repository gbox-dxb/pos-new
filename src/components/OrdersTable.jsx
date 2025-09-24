import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Package, ExternalLink, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import BulkActionsToolbar from '@/components/BulkActionsToolbar';
import EditableField from '@/components/EditableField';
import Pagination from '@/components/Pagination';
import { generateOrderPDF } from '@/lib/pdfGenerator';
import { useAccessControl } from '@/contexts/AccessControlContext';
import { useToast } from '@/components/ui/use-toast';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";

import axios from "axios";
import moment from "moment";
import Swal from "sweetalert2";

const OrderRow = ({ order, index, isDuplicatePhone, isSelected, onSelectionChange, onUpdateOrderDetails, visibleColumns, onTrashSelected }) => {
  const { toast } = useToast();
  
  const { permissions } = useAccessControl();
  const canEdit = permissions.tabs.orders === 'edit';

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'processing': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'on-hold': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'completed': 'bg-green-500/20 text-green-400 border-green-500/30',
      'cancelled': 'bg-red-500/20 text-red-400 border-red-500/30',
      'refunded': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'failed': 'bg-red-500/20 text-red-400 border-red-500/30',
      'trash': 'bg-zinc-600/20 text-zinc-500 border-zinc-600/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFieldSave = (orderId, data) => {
    return onUpdateOrderDetails(order.store_id, orderId, data);
  };
  
  const BillingAddress = ({ address, meta_data }) => {
    if (!address) return 'N/A';
    const city = meta_data?.find(item => item.key === '_billing_area')?.value || 'N/A';
    return (
      <div className="space-y-1">
        <div className="flex gap-1">
          <EditableField initialValue={address.first_name} onSave={handleFieldSave} fieldName="billing.first_name" orderId={order.id} disabled={!canEdit} />
          <EditableField initialValue={address.last_name} onSave={handleFieldSave} fieldName="billing.last_name" orderId={order.id} disabled={!canEdit} />
        </div>
        <EditableField initialValue={address.company} onSave={handleFieldSave} fieldName="billing.company" orderId={order.id} disabled={!canEdit} />
        <EditableField initialValue={address.address_1} onSave={handleFieldSave} fieldName="billing.address_1" orderId={order.id} disabled={!canEdit} />
        <EditableField initialValue={address.address_2} onSave={handleFieldSave} fieldName="billing.address_2" orderId={order.id} disabled={!canEdit} />
        <div className="flex gap-1">
          <EditableField initialValue={address.city || city} onSave={handleFieldSave} fieldName="billing.city" orderId={order.id} disabled={!canEdit} />
          <EditableField initialValue={address.state} onSave={handleFieldSave} fieldName="billing.state" orderId={order.id} disabled={!canEdit} />
        </div>
        <div className="flex gap-1">
          <EditableField initialValue={address.postcode} onSave={handleFieldSave} fieldName="billing.postcode" orderId={order.id} disabled={!canEdit} />
          <EditableField initialValue={address.country} onSave={handleFieldSave} fieldName="billing.country" orderId={order.id} disabled={!canEdit} />
        </div>
        <EditableField initialValue={address.email} onSave={handleFieldSave} fieldName="billing.email" orderId={order.id} disabled={!canEdit} />
        <EditableField initialValue={address.phone} onSave={handleFieldSave} fieldName="billing.phone" orderId={order.id} isDuplicatePhone={isDuplicatePhone} disabled={!canEdit} />
      </div>
    );
  };

  const ShippingAddress = ({ address }) => {
    if (!address || Object.keys(address).length === 0) return 'N/A';
    const parts = [
      `${address.first_name || ''} ${address.last_name || ''}`.trim(),
      address.company,
      address.address_1,
      address.address_2,
      `${address.city || ''}, ${address.state || ''} ${address.postcode || ''}`.trim(),
      address.country,
    ].filter(Boolean).filter(p => p.trim() !== ',');
    return (
      <div>
        {parts.map((part, i) => <div key={i}>{part}</div>)}
      </div>
    );
  };
  
  const DeliveryStatus = ({ order }) => {
    const [shipper, setShipper] = useState(false);    // loading state for this order
    const [loading, setLoading] = useState(false);    // loading state for this order
    
    const id =
      order.store_id === "whatsapp-order"
        ? order.id
        : order.store_name.slice(-3) + "" + order.id;
    
    const getStatusMeta = (status) => {
      switch (status.toLowerCase()) {
        case "submitted":
          return {
            className: "text-muted-foreground bg-gray-50 border-gray-400",
            icon: "",
          };
        case "delivered":
          return {
            className: "text-green-600 bg-green-50 border-green-100",
            icon: "",
          };
        case "return to origin":
          return {
            className: "text-orange-600 bg-orange-50 border-orange-100",
            icon: "",
          };
        case "unavailable":
          return {
            className: "text-red-600 bg-red-50 border-red-100",
            icon: "",
          };
        default:
          return {
            className: "text-blue-600 bg-blue-50 border-blue-100",
            icon: "⚡︎",
          };
      }
    }
    
    const showTrackingDetails = (shipment) => {
      Swal.fire({
        title: `Current Status: ${(shipment["status"] || "Ready to Dispatch")}`,
        html: `
          <div class="text-left mt-2 space-y-3">
            ${[...shipment["Activity"]]
              .reverse()
              .map((item) => {
                const {className, icon} = getStatusMeta(item.status);
                return `
                  <div class="p-3 border rounded-lg shadow-sm bg-white flex flex-col ${item.location.toLowerCase() === 'submitted' ? 'border-emerald-600' : 'border-gray-300'}">
                    <div class="capitalize text-green-600 flex w-100 justify-between items-center">
                      <div class="text-gray-500 text-sm">
                          <span class="text-xs">${moment(item.datetime).format("MMM DD, YYYY, hh:mm A")}</span> -
                          ${item.location.toLowerCase()}
                      </div>
                      <span class="capitalize inline-block px-2 py-1 text-xs border rounded-full ${className}">
                        ${item.status.toLowerCase()} ${icon}
                      </span>
                    </div>
                    <span class="capitalize text-gray-700 text-sm">${item.details.toLowerCase()}</span>
                  </div>
                `
              }).join("")}
          </div>
        `,
        customClass: {
          popup: "p-0 p-2 rounded-lg shadow-lg text-left",
          title: "px-4",
          htmlContainer: "px-4",
          actions: "p-4 w-full flex justify-end space-x-2 mt-1 text-end",
        }
      });
    };
    
    const handleCheck = ({shipper, url, apiKey}) => {
      setLoading(true);
      setShipper(shipper);
      
      const proxyUrl = `${import.meta.env.VITE_CORS_PROXY_URL}${url}`;
      const payload = { AwbNumber: [id] };
      const config = {
        headers: {
          "Content-Type": "application/json",
          "API-KEY": apiKey
        },
        timeout: 10000,
      };
      
      axios
      .post(proxyUrl, payload, config)
      .then((res) => {
        let result = res?.data;
        console.log("result:", result);
        
        let shipment;
        
        switch (shipper.toLowerCase()) {
          case "panda": {
            if (result?.success) { // 0 or 1
              shipment = result?.["TrackResponse"][0]["Shipment"];
              showTrackingDetails({
                id,
                status: shipment["current_status"] || "Ready to Dispatch",
                Activity: shipment["Activity"]
              });
            } else {
              Swal.fire({
                icon: "info",
                title: `${result?.message || "Unavailable"}`,
                text: "There are no tracking updates for this shipment.",
              });
            }
            break;
          }
          case "benex": {
            if (result?.success) { // 0 or 1
              shipment = result?.["TrackResponse"][0]["Shipment"];
              showTrackingDetails(shipment);
            } else {
              Swal.fire({
                icon: "info",
                title: `${result?.message || "Unavailable"}`,
                text: "There are no tracking updates for this shipment.",
              });
            }
            break;
          }
        }
        
      })
      .catch((err) => {
        console.error("Error fetching status for order:", id, err);
        Swal.fire({
          icon: "info",
          title: `${result?.message || "Unavailable"}`,
          text: "There are no tracking updates for this shipment.",
        });
      })
      .finally(() => setLoading(false));
    };
    
    /*useEffect(() => {
      let isMounted = true;
      
      setLoading(true);
      
      const isOnHold = order.status === "on-hold";
      
      // only check onHold order
      if(!isOnHold) return;
      
      const pandaUrl = 'https://app.deliverypanda.me/webservice/GetTracking';
      const endpoint = isOnHold ? pandaUrl : '';
      const proxyUrl = `${CORS_PROXY_URL}${endpoint}`;
      
      const payload = {
        AwbNumber: [id]
      };
      const config = {
        headers: {
          "Content-Type": "application/json",
          "API-KEY": "159f8f293e01fd605d3b6dbad83cada2"
        },
        timeout: 10000 // optional: 10 sec like in cURL
      };
      axios.post(proxyUrl, payload, config)
      .then((res) => {
        if (isMounted) {
          console.error("response::", res);
          setStatus(res.data.status || "Ready to Dispatch");
        }
      })
      .catch((err) => {
        console.error("Error fetching status for order:", id, err);
        if (isMounted) setStatus("error");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
      
      return () => {
        isMounted = false;
      };
    }, [id]);*/
    
    return (
      <>
        {loading ? (
          <div className="text-muted-foreground px-3 py-1 border font-medium rounded-full">
            Checking {shipper.toUpperCase()}..
          </div>
        ) : (
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              disabled={loading}
              className={`uppercase px-3 text-xs font-medium text-white bg-orange-600 border border-orange-700 rounded-l-full hover:bg-orange-700 focus:z-10 focus:ring-2 focus:ring-orange-500 cursor-pointer`}
              onClick={() =>
                handleCheck({
                  shipper: "panda",
                  url: import.meta.env.VITE_PANDA_URL,
                  apiKey: import.meta.env.VITE_PANDA_API_KEY,
                })
              }
            >
              panda
            </button>
            <button
              type="button"
              disabled={loading}
              className={`uppercase px-3 py-1 text-xs font-medium text-white bg-orange-600 border border-orange-700 rounded-r-full hover:bg-orange-700 focus:z-10 focus:ring-2 focus:ring-orange-500 cursor-pointer`}
              onClick={() =>
                handleCheck({
                  shipper: "benex",
                  url: import.meta.env.VITE_BENEX_URL,
                  apiKey: import.meta.env.VITE_BENEX_API_KEY,
                })
              }
            >
              benex
            </button>
          </div>
        )}
        {/*<Select disabled={loading} onValueChange={(action) => {
          if (action === "panda") {
            handleCheck({
              shipper: action,
              url: "https://app.deliverypanda.me/webservice/GetTracking",
              apiKey: "d68627256a4115c78102641f3044cf5f",
            });
          }
          if (action === "benex") {
            handleCheck({
              shipper: action,
              url: "https://online.benexcargo.com/webservice/GetTracking",
              apiKey: "a97869c2993b5b059d1e3885f2003ee7",
            });
          }
        }}>
          <SelectTrigger className="">
            <SelectValue placeholder="Track Delivery"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="panda">{loading ? 'checking..' : 'Panda'}</SelectItem>
            <SelectItem value="benex">{loading ? 'checking..' : 'Benex'}</SelectItem>
          </SelectContent>
        </Select>*/}
      </>
    );
  };
  
  const uniqueKey = `${order.store_id}-${order.id}`;
  
  return (
    <motion.tr
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.3, delay: index * 0.05}}
      className={`align-top transition-colors ${isDuplicatePhone ? 'bg-red-500/10' : ''} ${isSelected ? 'bg-primary/10' : ''}`}
    >
      <td className="">
        <div className="flex justify-center items-center h-full">
          <Checkbox
            id={`select-${uniqueKey}`}
            checked={isSelected}
            onCheckedChange={() => onSelectionChange(uniqueKey)}
            disabled={!canEdit}
          />
        </div>
      </td>
      {visibleColumns.order && <td>
        <div className="font-medium text-primary">
          #{order.id}
        </div>
        <div className="text-xs text-muted-foreground">{order.store_name}</div>
      </td>}
      {visibleColumns.status && <td>
        <Badge variant="outline" className={`status-badge ${getStatusColor(order.status)}`}>
          {order.status.replace('-', ' ').toUpperCase()}
        </Badge>
      </td>}
      {visibleColumns.date && <td>
        <div className="text-sm whitespace-nowrap lg:whitespace-normal">
          {formatDate(order.date_created)}
        </div>
      </td>}
      
      {visibleColumns.delivery_status && <td style={{ textAlign: "center" }}>
        <DeliveryStatus order={order}/>
      </td>}
      
      {visibleColumns.ref && <td className={'cursor-pointer'} onClick={() => {
        let ref = order.store_id === "whatsapp-order" ? order.id : order.store_name.slice(-3) + '' + order.id;
        if (ref) {
          navigator.clipboard.writeText(ref)
          .then(() => {
            toast({
              title: `Copied ${ref}`,
              description: `Successfully Copied To Clipboard!`
            });
          })
          .catch(err => console.error("failed to copy:", err))
        }
      }}>
        <div className="text-xs text-gray-500 font-bold text-base">{(order.store_id === "whatsapp-order" ? order.id : order.store_name.slice(-3) + '' + order.id ).toUpperCase()}</div>
      </td>}
      {visibleColumns.billing && <td className="text-xs">
        <BillingAddress address={order.billing} meta_data={order?.meta_data} />
      </td>}
      {visibleColumns.shipping && <td className="text-xs"><ShippingAddress address={order.shipping} /></td>}
      {visibleColumns.items && <td className="text-xs">
        <ul className="space-y-1">
          {order.line_items?.map(item => (
            <li key={item.id}>
              {
                order.store_name.toLowerCase() === 'whatsapp' ? (item.name) : (
                  <a
                    href={`${order.store_url}?p=${item.product_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {item.quantity}-PC(s) {item.name} <ExternalLink className="h-3 w-3" />
                  </a>
                )
              }
            </li>
          ))}
        </ul>
        {/*{order.customer_note && (*/}
          <div className="mt-2 p-2 bg-red-500/10 border-l-2 border-red-400 text-red-600 text-xs">
            <strong>Note:</strong> {}
            <EditableField
              initialValue={order.customer_note || '-'}
              onSave={handleFieldSave}
              fieldName="customer_note"
              orderId={order.id}
              disabled={!canEdit}
            />
          </div>
        {/*)}*/}
      </td>}
      {visibleColumns.payment && <td>
        <div className="text-sm">{order.payment_method_title}</div>
      </td>}
      {visibleColumns.total && <td>
        <div className="font-medium text-green-400">
          <EditableField 
            initialValue={order.total} 
            onSave={handleFieldSave} 
            fieldName="total" 
            orderId={order.id} 
            disabled={!canEdit} 
          />
        </div>
      </td>}
      {visibleColumns.actions && <td>
        <div className="flex align-middle justify-center items-center text-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open(`${order.store_url}wp-admin/post.php?post=${order.id}&action=edit`, '_blank')}
            title="View in WP Admin"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => generateOrderPDF(order)}
            title="Download PDF Invoice"
          >
            <FileText className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              let rowCheckbox = document.getElementById(`select-${uniqueKey}`);
              if (rowCheckbox) {
                rowCheckbox.click();
                onTrashSelected();
              }
            }}
            title="Move to Trash"
          >
            <Trash2 className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </td>}
    </motion.tr>
  );
};

const OrdersTable = ({ orders, loading, onUpdateOrders, isUpdatingOrders, onUpdateOrderDetails, screenOptions, selectedRows, setSelectedRows, onTrashSelected, onDeletePermanently, isTrashView = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { permissions } = useAccessControl();
  const canEdit = isTrashView ? permissions.tabs.trashed === 'edit' : permissions.tabs.orders === 'edit';

  const phoneNumbersCount = useMemo(() => {
    const counts = {};
    orders.forEach(order => {
      const phone = order.billing?.phone?.replace(/\D/g, '');
      if (phone) {
        counts[phone] = (counts[phone] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders, screenOptions.itemsPerPage]);

  const totalPages = Math.ceil(orders.length / screenOptions.itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * screenOptions.itemsPerPage;
    return orders.slice(startIndex, startIndex + screenOptions.itemsPerPage);
  }, [orders, currentPage, screenOptions.itemsPerPage]);

  const handleSelectionChange = (orderKey) => {
    if (!canEdit) return;
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(orderKey)) {
        newSelection.delete(orderKey);
      } else {
        newSelection.add(orderKey);
      }
      return newSelection;
    });
  };

  const handleSelectAll = (checked) => {
    if (!canEdit) return;
    if (checked) {
      const allOrderKeys = new Set(paginatedOrders.map(o => `${o.store_id}-${o.id}`));
      setSelectedRows(allOrderKeys);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleUpdateStatus = (status) => {
    if (!canEdit) return;
    const ordersToUpdate = orders.filter(o => selectedRows.has(`${o.store_id}-${o.id}`));
    onUpdateOrders(ordersToUpdate, status);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0 && !loading) {
    return (
      <div className="p-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Orders Found</h3>
        <p className="text-muted-foreground">
          {isTrashView ? "The trash is empty." : "No orders match your current filters. Try adjusting your search criteria or sync your stores."}
        </p>
      </div>
    );
  }

  const currentSelectionOnPage = paginatedOrders.filter(o => selectedRows.has(`${o.store_id}-${o.id}`));
  const isAllOnPageSelected = currentSelectionOnPage.length > 0 && currentSelectionOnPage.length === paginatedOrders.length;
  const isIndeterminate = currentSelectionOnPage.length > 0 && currentSelectionOnPage.length < paginatedOrders.length;

  return (
    <>
      {canEdit && <BulkActionsToolbar
        selectedCount={selectedRows.size}
        onUpdateStatus={handleUpdateStatus}
        onClearSelection={() => setSelectedRows(new Set())}
        isUpdating={isUpdatingOrders}
        onTrashSelected={onTrashSelected}
        onDeletePermanently={onDeletePermanently}
        isTrashView={isTrashView}
        selectedRows={selectedRows}
        orders={orders}
      />}
      <div className="overflow-x-auto rounded-lg border">
        <table className="woo-table">
          <thead>
            <tr>
              <th style={{ width: "42px" }}>
                <Checkbox
                  id="select-all"
                  checked={isAllOnPageSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all rows on this page"
                  data-state={isIndeterminate ? 'indeterminate' : (isAllOnPageSelected ? 'checked' : 'unchecked')}
                  disabled={!canEdit}
                />
              </th>
              {screenOptions.visibleColumns.order && <th style={{ width: "120px" }}>Order</th>}
              {screenOptions.visibleColumns.status && <th style={{ width: "130px" }}>Status</th>}
              {screenOptions.visibleColumns.date && <th style={{ width: "120px" }}>Date</th>}
              {screenOptions.visibleColumns.delivery_status && <th style={{ width: "170px", textAlign: "center" }}>Delivery Status</th>}
              {screenOptions.visibleColumns.ref && <th style={{ width: "120px" }}>Reference</th>}
              {screenOptions.visibleColumns.billing && <th>Billing</th>}
              {screenOptions.visibleColumns.shipping && <th>Ship to</th>}
              {screenOptions.visibleColumns.items && <th>Items & Notes</th>}
              {screenOptions.visibleColumns.payment && <th style={{ width: "140px" }}>Payment</th>}
              {screenOptions.visibleColumns.total && <th style={{ width: "100px" }}>Total</th>}
              {screenOptions.visibleColumns.actions && <th style={{ width: "12%", textAlign: "center" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order, index) => {
              const uniqueKey = `${order.store_id}-${order.id}`;
              const phone = order.billing?.phone?.replace(/\D/g, '');
              const isDuplicate = phone && phoneNumbersCount[phone] > 1;
              return <OrderRow
                key={uniqueKey}
                order={order}
                index={index}
                isDuplicatePhone={isDuplicate}
                isSelected={selectedRows.has(uniqueKey)}
                onSelectionChange={handleSelectionChange}
                onUpdateOrderDetails={onUpdateOrderDetails}
                visibleColumns={screenOptions.visibleColumns}
                onTrashSelected={onTrashSelected}
              />
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={screenOptions.itemsPerPage}
        totalItems={orders.length}
      />
    </>
  );
};

export default OrdersTable;