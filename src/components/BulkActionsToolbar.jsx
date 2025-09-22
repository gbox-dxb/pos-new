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
import { getDatabase, ref, remove } from "firebase/database";

const BulkActionsToolbar = ({
  selectedCount,
  onUpdateStatus,
  onClearSelection,
  isUpdating,
  onTrashSelected,
  isTrashView,
  selectedRows
}) => {
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
          const db = getDatabase();
          for (const id of trashIds) {
            try {
              await remove(ref(db, `orders/${id}`));
              console.log(`Deleted order ${id}`);
            } catch (err) {
              console.error(`Failed to delete ${id}`);
            }
          }
          break;
        }
        default: {
          alert('Method Not Configured!');
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
                    <SelectValue placeholder="Bulk actions..." />
                  </SelectTrigger>
                  <SelectContent>
                    {!isTrashView && (
                      <>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            Change status to {status.replace('-', ' ')}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
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
                        <SelectSeparator />
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
                  disabled={!selectedStatus || isUpdating}
                >
                  {isUpdating ? 'Applying...' : 'Apply'}
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkActionsToolbar;