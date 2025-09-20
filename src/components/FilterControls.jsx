
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import ScreenOptions from '@/components/ScreenOptions';
import { DateRangePicker } from '@/components/DateRangePicker';

const FilterControls = ({ orders, stores, onFilterChange, filteredCount, screenOptions, onScreenOptionsChange,statusFilter, setStatusFilter }) => {
    const [searchTerm, setSearchTerm] = useState('');
   
    const [storeFilter, setStoreFilter] = useState('all');
    const [dateRange, setDateRange] = useState(undefined);

    const orderStatuses = useMemo(() => [
        { value: 'all', label: 'All Statuses' },
        { value: 'delete_permanently', label: 'Delete Permanently' },
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'on-hold', label: 'Out for Delivery' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'refunded', label: 'Refunded' },
        { value: 'failed', label: 'Failed' },
    ], []);

    const storeOptions = useMemo(() => {
        const hasWhatsAppStore = stores.some(s => s.id === 'whatsapp-order');
        const allStores = [...stores];
        if (!hasWhatsAppStore) {
            allStores.push({ id: 'whatsapp-order', name: 'WhatsApp' });
        }
        return [
            { value: 'all', name: 'All Stores' },
            ...allStores
        ];
    }, [stores]);

    const applyFilters = useCallback(() => {
        let filtered = [...orders];

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(order => {
                const orderString = JSON.stringify(order).toLowerCase();
                return orderString.includes(lowercasedTerm);
            });
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        if (storeFilter !== 'all') {
            filtered = filtered.filter(order => order.store_id === storeFilter);
        }

        if (dateRange?.from) {
            const fromDate = new Date(dateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            
            const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
            toDate.setHours(23, 59, 59, 999);

            filtered = filtered.filter(order => {
                const orderDate = new Date(order.date_created);
                return orderDate >= fromDate && orderDate <= toDate;
            });
        }

        onFilterChange(filtered);
    }, [orders, searchTerm, statusFilter, storeFilter, dateRange, onFilterChange]);

    useEffect(() => {
        applyFilters();
    }, [orders, searchTerm, statusFilter, storeFilter, dateRange, applyFilters]);

    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setStoreFilter('all');
        setDateRange(undefined);
    };

    return (
      <>
        <Card className="p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search all order fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4 w-full lg:w-auto items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {orderStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent>
                  {storeOptions.map(store => (
                    <SelectItem key={store.id || store.value} value={store.id || store.value}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <ScreenOptions
                visibleColumns={screenOptions.visibleColumns}
                itemsPerPage={screenOptions.itemsPerPage}
                onColumnChange={(column, checked) => onScreenOptionsChange('visibleColumns', { ...screenOptions.visibleColumns, [column]: checked })}
                onItemsPerPageChange={(value) => onScreenOptionsChange('itemsPerPage', value)}
              />
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
        </Card>
        <div className="text-right mt-2 text-sm text-muted-foreground me-3">
          Showing {filteredCount} of {orders.length} orders
        </div>
      </>
    );
};

export default FilterControls;
