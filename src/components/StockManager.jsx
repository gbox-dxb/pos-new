import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { fetchAllProducts, updateProductBatch, deleteProductBatch, exportProductsToExcel, importProductsFromExcel } from '@/lib/woocommerce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, Package, PackageCheck, PackageX, DollarSign, Trash2, Edit, Loader2, ExternalLink, Eye, Upload, Download } from 'lucide-react';
import EditableField from '@/components/EditableField';

const StockStatusEditable = ({ value, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = async (newValue) => {
    if (newValue === value) return;
    setIsSaving(true);
    try {
      await onSave({ stock_status: newValue });
    } catch (error) {
      console.error("Failed to save stock status:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Select onValueChange={handleSelect} value={value}>
          <SelectTrigger className={`h-8 w-[120px] text-xs ${value === 'instock' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="instock">In Stock</SelectItem>
            <SelectItem value="outofstock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

const StockManager = ({ stores }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setSelectedRows(new Set());
    try {
      const allProducts = await fetchAllProducts(stores, toast);
      setProducts(allProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [stores, toast]);

  useEffect(() => {
    if (stores.length > 0) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [stores, fetchProducts]);

  const handleFieldSave = async (productId, data) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setIsUpdating(true);
    try {
      await updateProductBatch({
        productsToUpdate: [{ ...product, ...data }],
        stores,
        toast,
      });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...data } : p));
    } catch (error) {
      console.error("Failed to update product:", error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdate = async (action, value) => {
    if (selectedRows.size === 0) return;
    
    let updateData = {};
    if (action === 'price') {
      const newPrice = prompt("Enter new regular price for selected products:");
      if (newPrice === null || isNaN(parseFloat(newPrice))) {
        toast({ title: "Invalid Price", description: "Please enter a valid number.", variant: "destructive" });
        return;
      }
      updateData = { regular_price: newPrice };
    } else if (action === 'sale_price') {
        const newSalePrice = prompt("Enter new sale price for selected products (leave empty to remove):");
        if (newSalePrice === null) return;
        updateData = { sale_price: newSalePrice };
    } else if (action === 'status') {
      updateData = { stock_status: value };
    }

    setIsUpdating(true);
    const productsToUpdate = products.filter(p => selectedRows.has(p.id));
    const updatedProducts = productsToUpdate.map(p => ({ ...p, ...updateData }));

    try {
      await updateProductBatch({ productsToUpdate: updatedProducts, stores, toast });
      setProducts(prev => prev.map(p => selectedRows.has(p.id) ? { ...p, ...updateData } : p));
      setSelectedRows(new Set());
    } catch (error) {
      console.error("Bulk update failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.size} product(s)? This action cannot be undone.`)) return;

    setIsUpdating(true);
    const productsToDelete = products.filter(p => selectedRows.has(p.id));
    
    try {
      await deleteProductBatch({ productsToDelete, stores, toast });
      setProducts(prev => prev.filter(p => !selectedRows.has(p.id)));
      setSelectedRows(new Set());
    } catch (error) {
      console.error("Bulk delete failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const searchMatch = searchTerm.length === 0 ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const statusMatch = statusFilter === 'all' || product.stock_status === statusFilter;
      const storeMatch = storeFilter === 'all' || product.store_id === storeFilter;
      return searchMatch && statusMatch && storeMatch;
    });
  }, [products, searchTerm, statusFilter, storeFilter]);

  const handleSelectionChange = (productId) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(productId)) {
        newSelection.delete(productId);
      } else {
        newSelection.add(productId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleExport = () => {
    const productsToExport = selectedRows.size > 0
      ? products.filter(p => selectedRows.has(p.id))
      : filteredProducts;
    exportProductsToExcel(productsToExport, toast);
  };

  const handleImportClick = () => {
    if (stores.length === 0) {
      toast({
        title: "Cannot Import Products",
        description: "Please add at least one store before importing products.",
        variant: "destructive",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      await importProductsFromExcel(file, stores, toast);
      fetchProducts(); // Refresh products after import
    } catch (error) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const isAllSelected = selectedRows.size > 0 && selectedRows.size === filteredProducts.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < filteredProducts.length;

  const stats = useMemo(() => ({
    total: products.length,
    inStock: products.filter(p => p.stock_status === 'instock').length,
    outOfStock: products.filter(p => p.stock_status === 'outofstock').length,
  }), [products]);

  const statCards = [
    { title: 'Total Products', value: stats.total, icon: Package },
    { title: 'In Stock', value: stats.inStock, icon: PackageCheck },
    { title: 'Out of Stock', value: stats.outOfStock, icon: PackageX },
  ];

  const storeOptions = useMemo(() => [
    { value: 'all', name: 'All Stores' },
    ...stores.map(s => ({ value: s.id, name: s.name }))
  ], [stores]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setStoreFilter('all');
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls, .csv"
      />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <CardTitle>Stock Manager</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleImportClick} variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={fetchProducts} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Sync Products
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(stat => (
          <Card key={stat.title}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4 w-full lg:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="instock">In Stock</SelectItem>
                  <SelectItem value="outofstock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent>
                  {storeOptions.map(store => (
                    <SelectItem key={store.value} value={store.value}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>
          {selectedRows.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/50 p-3 rounded-lg flex flex-wrap items-center gap-4">
              <span className="font-semibold">{selectedRows.size} selected</span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleBulkUpdate('price')} disabled={isUpdating}>
                  <DollarSign className="h-4 w-4 mr-2" /> Change Regular Price
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkUpdate('sale_price')} disabled={isUpdating}>
                  <DollarSign className="h-4 w-4 mr-2" /> Change Sale Price
                </Button>
                <Select onValueChange={(value) => handleBulkUpdate('status', value)} disabled={isUpdating}>
                  <SelectTrigger className="h-9 text-xs w-[150px]">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instock">In Stock</SelectItem>
                    <SelectItem value="outofstock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={isUpdating}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            </motion.div>
          )}
        </CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    data-state={isIndeterminate ? 'indeterminate' : (isAllSelected ? 'checked' : 'unchecked')}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Regular Price</TableHead>
                <TableHead>Sale Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Loading products...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map(product => {
                  const store = stores.find(s => s.id === product.store_id);
                  return (
                    <TableRow key={`${product.id}-${product.store_id}`} data-state={selectedRows.has(product.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(product.id)}
                          onCheckedChange={() => handleSelectionChange(product.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-xs">
                        <EditableField
                          initialValue={product.name}
                          onSave={(id, data) => handleFieldSave(id, data)}
                          fieldName="name"
                          orderId={product.id}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{product.sku || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{product.store_name}</TableCell>
                      <TableCell>
                        <StockStatusEditable
                          value={product.stock_status}
                          onSave={(data) => handleFieldSave(product.id, data)}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableField
                          initialValue={product.regular_price}
                          onSave={(id, data) => handleFieldSave(id, data)}
                          fieldName="regular_price"
                          orderId={product.id}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableField
                          initialValue={product.sale_price}
                          onSave={(id, data) => handleFieldSave(id, data)}
                          fieldName="sale_price"
                          orderId={product.id}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(product.permalink, '_blank')}
                            title="View Product"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(`${store?.url}/wp-admin/post.php?post=${product.id}&action=edit`, '_blank')}
                            title="Edit in WP Admin"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default StockManager;