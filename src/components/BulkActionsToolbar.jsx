import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, remove } from "firebase/database";

import axios from "axios";
import moment from "moment";
import Swal from "sweetalert2";

const BulkActionsToolbar = ({
  selectedCount,
  onUpdateStatus,
  onClearSelection,
  isUpdating,
  onTrashSelected,
  isTrashView,
  selectedRows,
  orders
}) => {
  const [batchTrackingStatus, setBatchTrackingStatus] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const statuses = [
    'pending',
    'processing',
    'on-hold',
    'completed',
    'cancelled',
    'refunded',
  ];

  const handleUpdateClick = async () => {
    if (selectedStatus) {
      switch (selectedStatus) {
        case 'trash': {
          onTrashSelected();
          break;
        }
        case 'restore': {
          onUpdateStatus(selectedStatus);
          break;
        }
        case 'delete_permanently': {
          const trashIds = new Set(selectedRows);
          for (const uniqueKey of trashIds) {
            let id = uniqueKey.split("-").pop()
            try {
              const orderRef = ref(database, `orders/${id}`);
              await remove(orderRef);
              console.log(`Trash order deleted ${id}`);
            }
            catch (err) {
              console.error(`Failed to delete ${id}`);
            }
          }
          break;
        }
        case 'track': {
          try {
            // pick top 5 for batch orders for status responses
            const limitedOrders = orders.slice(0, 5);
            
            // run requests in parallel
            const results = await Promise.all(
              limitedOrders.map(async (order) => {
                setBatchTrackingStatus(true);
                
                const id =
                  order.store_id === "whatsapp-order"
                    ? order.id
                    : order.store_name.slice(-3) + "" + order.id;
                
                const proxyUrl = `${import.meta.env.VITE_CORS_PROXY_URL}${import.meta.env.VITE_PANDA_URL}`;
                const payload = { AwbNumber: [id] };
                const config = {
                  headers: {
                    "Content-Type": "application/json",
                    "API-KEY": import.meta.env.VITE_PANDA_API_KEY,
                  },
                  timeout: 30000,
                };
                
                try {
                  const res = await axios.post(proxyUrl, payload, config);
                  let result = res?.data;
                  console.log("result:", result);
                  
                  let shipment;
                  if (result?.success && result?.["TrackResponse"]?.length > 0) {
                    shipment = result?.["TrackResponse"][0]["Shipment"];
                    return {
                      id,
                      status: shipment["current_status"] || "Ready to Dispatch",
                      status_datetime: shipment["status_datetime"],
                      location: shipment["ShipmentAddress"]["address"] + '' + shipment["ShipmentAddress"]["city"],
                    };
                  } else {
                    return {
                      id,
                      status: "Unavailable",
                      status_datetime: new Date(),
                      message: result?.message
                    };
                  }
                } catch (err) {
                  console.error("Error fetching statuses:", id, err);
                  return {
                    id,
                    status: "Unavailable",
                    status_datetime: new Date(),
                    message: ""
                  };
                }
              })
            );
            
            // Build Swal HTML with merged statuses
            const html = `
              <div class="text-left mt-2 space-y-3">
                ${results
                  .map((item) => `
                    <div class="p-3 border border-gray-300 rounded-lg shadow-sm bg-white flex flex-col">
                      <div class="capitalize text-green-600 flex w-100 justify-between items-center">
                        <div class="text-gray-500 text-sm">${item.id} - <span class="text-xs">${moment(item.datetime).format("MMM DD, YYYY")}</span></div>
                        <span class="capitalize inline-block px-2 py-1 text-xs border border-gray-300 rounded-full text-green-600 bg-green-50">
                          ${item.status.toLowerCase()}
                        </span>
                      </div>
                      ${item.location ? `<span class="capitalize text-gray-400 text-xs">${item.location.toLowerCase()}</span>`: ""}
                      ${item.message ? `<span class="capitalize text-gray-400 text-xs">${item.message.toLowerCase()}</span>`: ""}
                    </div>
                  `)
                  .join("")}
              </div>
            `;
            
            // Trigger popup statuses
            Swal.fire({
              title: `Panda Orders Status`,
              html,
              customClass: {
                popup: "p-0 p-2 rounded-lg shadow-lg text-left",
                title: "px-4",
                htmlContainer: "px-4",
                actions: "p-4 w-full flex justify-end space-x-2 mt-1 text-end",
              }
            });
          }
          catch (e) {
            alert('Something went wrong.');
          }
          finally {
            setBatchTrackingStatus(false);
          }
          break;
        }
        default: {
          onUpdateStatus(selectedStatus);
        }
      }
     /* if (selectedStatus === 'trash') {
        onTrashSelected(); 
      } else {
        onUpdateStatus(selectedStatus);
      }*/
    }
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="my-4"
        >
          <Card className="p-3 flex items-center justify-between bg-background/80 backdrop-blur-md border-slate-700">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">
                {selectedCount} order(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Select onValueChange={setSelectedStatus} value={selectedStatus}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Bulk actions.."/>
                  </SelectTrigger>
                  <SelectContent>
                    {!isTrashView && (
                      <>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            Change status to {status.replace('-', ' ')}
                          </SelectItem>
                        ))}
                        <SelectSeparator/>
                        <SelectItem value="track" title={'Available: Panda Courier'}>
                          Track Delivery Status {selectedCount > 5 ? (<sup>(Top 5)</sup>) : ''}
                        </SelectItem>
                        <SelectItem value="trash">
                          Move to Trash
                        </SelectItem>
                      </>
                    )}
                    {isTrashView && (
                      <>
                        <SelectItem value="restore">
                          Restore from Trash
                        </SelectItem>
                        <SelectSeparator/>
                        <SelectItem value="delete_permanently">
                          Delete Permanently
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleUpdateClick}
                  disabled={!selectedStatus || isUpdating || batchTrackingStatus}
                >
                  {isUpdating || batchTrackingStatus ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
                           fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Applying...
                    </>
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClearSelection}>
              <X className="h-4 w-4"/>
            </Button>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkActionsToolbar;