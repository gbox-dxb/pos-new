import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Store, Trash2, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAccessControl } from '@/contexts/AccessControlContext';

const StoresList = ({ stores, loading, onSync, onAddStore, onEditStore, onDeleteStore }) => {
  const { permissions } = useAccessControl();
  const canEdit = permissions.tabs.stores === 'edit';

  if (stores.length === 0) {
    return (
      <div className="p-8 text-center col-span-full">
        <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Stores Connected</h3>
        <p className="text-muted-foreground mb-4">
          Add your first WooCommerce store to start managing orders
        </p>
        {canEdit && (
          <Button onClick={onAddStore}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Store
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stores.map(store => (
        <Card key={store.id} className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg break-all pr-2">{store.name}</h3>
              <Badge variant={store.connected ? "default" : "destructive"} className={store.connected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                {store.connected ? "Connected" : "Error"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1 break-all">{store.url}</p>
            {store.lastSync && (
              <p className="text-xs text-muted-foreground">
                Last sync: {new Date(store.lastSync).toLocaleString()}
              </p>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {permissions.syncOrders && (
              <Button
                onClick={() => onSync(store.id)}
                disabled={loading}
                className="w-full"
                variant="secondary"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Sync This Store
              </Button>
            )}
            {canEdit && (
              <div className="flex gap-2">
                 <Button
                  onClick={() => onEditStore(store)}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                 >
                   <Edit className="h-3 w-3 mr-2" />
                   Edit
                 </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex-1" size="sm">
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        <strong> {store.name} </strong> store and all its associated data from this dashboard.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteStore(store.id)}>
                        Yes, delete it
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </Card>
      ))}
      {canEdit && (
         <Card className="border-dashed border-2 hover:border-primary transition-colors flex items-center justify-center min-h-[150px]">
            <Button variant="ghost" onClick={onAddStore} className="text-muted-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Add New Store
            </Button>
         </Card>
      )}
    </div>
  );
};

export default StoresList;