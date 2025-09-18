import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { TrendingUp, Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const TopProducts = ({ orders, stores }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const dateFilters = useMemo(() => [
      { value: 'all', label: 'All Time' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'Last 7 Days' },
      { value: 'month', label: 'Last 30 Days' },
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

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    if (storeFilter !== 'all') {
        filtered = filtered.filter(order => order.store_id === storeFilter);
    }

    if (dateFilter !== 'all') {
        const now = new Date();
        let filterDate = new Date();
        if (dateFilter === 'today') {
            filterDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'week') {
            filterDate.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
            filterDate.setDate(now.getDate() - 30);
        }
        filtered = filtered.filter(order => new Date(order.date_created) >= filterDate);
    }

    return filtered;
  }, [orders, storeFilter, dateFilter]);

  const topProducts = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return [];

    const productCounts = new Map();

    filteredOrders.forEach(order => {
      if (order.line_items) {
        order.line_items.forEach(item => {
          const productId = item.product_id || item.sku || item.name;
          if (productId) {
            const existingProduct = productCounts.get(productId) || {
              name: item.name,
              sku: item.sku || 'N/A',
              quantity: 0,
            };
            existingProduct.quantity += item.quantity;
            productCounts.set(productId, existingProduct);
          }
        });
      }
    });

    let productsArray = Array.from(productCounts.values());

    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        productsArray = productsArray.filter(product => 
            product.name.toLowerCase().includes(lowercasedTerm) ||
            product.sku.toLowerCase().includes(lowercasedTerm)
        );
    }

    return productsArray
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 50);
  }, [filteredOrders, searchTerm]);

  const resetFilters = () => {
      setSearchTerm('');
      setStoreFilter('all');
      setDateFilter('all');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Top Selling Products</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your most popular items based on units sold.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search by product name or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4 w-full lg:w-auto">
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
                    
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-full lg:w-[150px]">
                            <SelectValue placeholder="Date" />
                        </SelectTrigger>
                        <SelectContent>
                            {dateFilters.map((date) => (
                                <SelectItem key={date.value} value={date.value}>
                                    {date.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="outline" onClick={resetFilters}>Reset</Button>
                </div>
            </div>
        </Card>

        {topProducts.length > 0 ? (
          <motion.div
            className="overflow-hidden rounded-lg border"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[150px]">SKU</TableHead>
                  <TableHead className="text-right w-[150px]">Units Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product, index) => (
                  <motion.tr
                    key={product.sku + product.name}
                    className="hover:bg-muted/50"
                    variants={itemVariants}
                  >
                    <TableCell className="font-bold text-lg text-muted-foreground">
                      #{index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="text-right font-bold text-primary text-lg">
                      {product.quantity.toLocaleString()}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">No Product Data Available</p>
            <p className="text-sm text-muted-foreground">No products match your current filters, or no orders have been synced yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopProducts;