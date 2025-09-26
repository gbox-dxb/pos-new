import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, MessageSquare, Trash, FileUp, ShieldAlert, Send, PlusCircle, Edit, X, Search, Save, Ban } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, remove, get, update } from 'firebase/database';
import EditableField from '@/components/EditableField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {DateRangePicker} from "@/components/DateRangePicker.jsx";

const WHATSAPP_SHEETS_REF = 'whatsapp_sheets';

const parseValue = (text, regex) => {
  const match = text.match(regex);
  return match ? match[1].trim() : '---';
};

function parseNote(text, noteType) {
  /*
  /^(important note|special note)\s*:/i.test(line) // starts with label
  */
  const pattern = new RegExp(`^(${noteType.toLowerCase()})\\s*:`, "i");
  const results = text
  .split(/\r?\n/)                      // split into lines
  .map(line => line.trim())            // clean spaces
  .filter(line => pattern.test(line))
  .map(line => {
    const [label, valueRaw = ""] = line.split(/:/); // split at colon
    const value = valueRaw.trim();
    return value && !/^(-+\s*)+$/.test(value)       // skip empty or only dashes
      ? value
      : '';
  })
  const note = results.filter(Boolean)
  return note[0] || '---';
}

const extractNumber = (str) => {
  let empty = !/^[-\s]+$/.test(str);
  if (!str || !empty) return 0;
  const num = parseFloat(str.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
};

const parseWhatsAppOrders = (text) => {
  const orderBlocks = text.split(/Ref#/).slice(1);

  return orderBlocks.map(block => {
    const fullBlock = `Ref#${block}`;
    /*
    const refLineMatch = fullBlock.match(/Ref#\s*(.*?)\s*(\d{2}\/\d{2}\/\d{2,4})\s*(.*)/);
    let refNum = '---';
    let date = '---';

    if (refLineMatch) {
      const part1 = refLineMatch[1] ? refLineMatch[1].trim().replace(/-$/, '') : '';
      date = refLineMatch[2] ? refLineMatch[2].trim() : '---';
      const part2 = refLineMatch[3] ? refLineMatch[3].trim().replace(/^-/, '') : '';
      refNum = [part1, part2].filter(Boolean).join('-');
    } else {
      refNum = parseValue(fullBlock, /Ref#\s*(.*)/).split('\n')[0];
    }
    */
    const refMatch = fullBlock.match(/Ref#\s*([A-Za-z0-9]+-?\s*\d+).*?(\d{2}\/\d{2}\/\d{2,4})/i);
    let refNum = '---';
    let date = '---';
    if (refMatch) {
      refNum = refMatch[1].replace(/\s+/g, ""); // WTSP-5879
      date = refMatch[2]; // 19/09/25
    }
    
    const price = parseValue(fullBlock, /Price\s*:\s*(.*)/);
    const finalAmount = extractNumber(price) + 'AED';
    
    return {
      id: uuidv4(),
      ref: refNum,
      date: date,
      name: parseValue(fullBlock, /Name\s*:\s*(.*)/),
      mobile: parseValue(fullBlock, /Mobile\s*:\s*(.*)/),
      address: parseValue(fullBlock, /Address\s*:\s*(.*)/),
      city: parseValue(fullBlock, /City\s*:\s*(.*)/),
      items: parseValue(fullBlock, /Item\(s\)\s*:\s*(.*)/),
      price: finalAmount,
      note: parseNote(fullBlock, 'Special Note'),
      delivery: parseValue(fullBlock, /Delivery:\s*(.*)/),
      totalPayment: parseValue(fullBlock, /TOTAL PAYMENT\s*:\s*(.*)/i),
      importantNote: parseNote(fullBlock, 'Important Note')
    };
  });
};

const SheetTabs = ({ sheets, activeSheetId, onSelectSheet, onAddSheet, onRenameSheet, onDeleteSheet }) => {
  const handleRename = (sheetId, currentName) => {
    const newName = prompt("Enter new sheet name:", currentName);
    if (newName && newName.trim() !== "") {
      onRenameSheet(sheetId, newName.trim());
    }
  };

  const handleDelete = (sheetId, sheetName) => {
    if (window.confirm(`Are you sure you want to delete the sheet "${sheetName}"? This action cannot be undone.`)) {
      onDeleteSheet(sheetId);
    }
  };

  return (
    <div className="flex items-center gap-1 p-2 bg-background/80 backdrop-blur-md border-b border-slate-700 overflow-x-auto">
      <Button variant="ghost" size="icon" onClick={onAddSheet}>
        <PlusCircle className="h-4 w-4" />
      </Button>
      
      {Object.values(sheets).map(sheet => (
        <div key={sheet.id} className="relative group flex-shrink-0">
          <Button
            variant={activeSheetId === sheet.id ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSelectSheet(sheet.id)}
            className="pr-14 me-1"
          >
            {sheet.name}
          </Button>
          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRename(sheet.id, sheet.name)}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(sheet.id, sheet.name)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const NewOrderRow = ({ onSave, onCancel }) => {
  const [newOrder, setNewOrder] = useState({
    ref: '', date: '', name: '', mobile: '', address: '', city: '',
    items: '', price: '', delivery: '', totalPayment: '', note: '', importantNote: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOrder(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(newOrder);
  };

  return (
    <TableRow className="bg-muted/50">
      <TableCell></TableCell>
      <TableCell><Input name="ref" value={newOrder.ref} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="date" value={newOrder.date} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="name" value={newOrder.name} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="mobile" value={newOrder.mobile} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="address" value={newOrder.address} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="city" value={newOrder.city} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="items" value={newOrder.items} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="price" value={newOrder.price} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="delivery" value={newOrder.delivery} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="totalPayment" value={newOrder.totalPayment} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="note" value={newOrder.note} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell><Input name="importantNote" value={newOrder.importantNote} onChange={handleInputChange} className="h-8" /></TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleSave} title="Save Order">
            <Save className="h-4 w-4 text-green-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onCancel} title="Cancel">
            <Ban className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};


const WhatsAppOrders = ({ onMoveOrder }) => {
  const [inputText, setInputText] = useState('');
  const [sheets, setSheets] = useState({});
  const [activeSheetId, setActiveSheetId] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isAddingOrder, setIsAddingOrder] = useState(false);

  useEffect(() => {
    const sheetsRef = ref(database, WHATSAPP_SHEETS_REF);
    const unsubscribe = onValue(sheetsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && Object.keys(data).length > 0) {
        setSheets(data);
        if (!activeSheetId || !data[activeSheetId]) {
          setActiveSheetId(Object.keys(data)[0]);
        }
      } else {
        const newSheetId = uuidv4();
        const initialSheet = {
          [newSheetId]: { id: newSheetId, name: 'Sheet 1', orders: {} }
        };
        set(sheetsRef, initialSheet);
        setSheets(initialSheet);
        setActiveSheetId(newSheetId);
      }
    }, (error) => {
      console.error("Failed to load WhatsApp sheets from Firebase:", error);
      toast({ title: 'Error', description: 'Could not load saved sheets.', variant: 'destructive' });
    });
    return () => unsubscribe();
  }, [toast, activeSheetId]);

  const handleAddSheet = () => {
    const newSheetId = uuidv4();
    const sheetName = `Sheet ${Object.keys(sheets).length + 1}`;
    const sheetRef = ref(database, `${WHATSAPP_SHEETS_REF}/${newSheetId}`);
    set(sheetRef, { id: newSheetId, name: sheetName, orders: {} });
    setActiveSheetId(newSheetId);
  };
  
  const handleRenameSheet = (sheetId, newName) => {
    const sheetRef = ref(database, `${WHATSAPP_SHEETS_REF}/${sheetId}`);
    update(sheetRef, { name: newName });
  };

  const handleDeleteSheet = (sheetId) => {
    if (Object.keys(sheets).length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one sheet.",
        variant: "destructive",
      });
      return;
    }

    const sheetRef = ref(database, `${WHATSAPP_SHEETS_REF}/${sheetId}`);
    remove(sheetRef).then(() => {
      toast({ title: 'Sheet Deleted', description: 'The sheet has been removed.' });
      if (activeSheetId === sheetId) {
        const remainingSheets = { ...sheets };
        delete remainingSheets[sheetId];
        setActiveSheetId(Object.keys(remainingSheets)[0] || null);
      }
    });
  };

  const handleParse = async () => {
    if (!activeSheetId) {
        toast({ title: 'No active sheet', description: 'Please select or create a sheet first.', variant: 'destructive' });
        return;
    }
    if (!inputText.trim()) {
      toast({ title: 'Input is empty', description: 'Please paste some messages to parse.', variant: 'destructive' });
      return;
    }
    const parsed = parseWhatsAppOrders(inputText);
    if (parsed.length === 0) {
      toast({ title: 'No orders found', description: 'Could not find any orders matching the format.', variant: 'destructive' });
      return;
    }

    try {
      const sheetOrdersRef = ref(database, `${WHATSAPP_SHEETS_REF}/${activeSheetId}/orders`);
      const snapshot = await get(sheetOrdersRef);
      const existingOrders = snapshot.val() || {};
      const newOrders = parsed.reduce((acc, order) => {
        acc[order.id] = order;
        return acc;
      }, {});
      await set(sheetOrdersRef, { ...existingOrders, ...newOrders });
      toast({ title: 'Success', description: `Parsed and saved ${parsed.length} new order(s) to ${sheets[activeSheetId].name}.` });
      setInputText('');
    } catch (error) {
      toast({ title: 'Error Saving Orders', description: 'Could not save orders to the database.', variant: 'destructive' });
    }
  };
  
  const handleClearInput = () => {
    setInputText('');
  };

  const handleClearDatabase = () => {
    const shouldClear = window.confirm("Are you sure you want to delete ALL sheets and orders? This action cannot be undone.");
    if (shouldClear) {
        const sheetsRef = ref(database, WHATSAPP_SHEETS_REF);
        remove(sheetsRef).then(() => {
            toast({ title: 'Database Cleared', description: 'All WhatsApp sheets and orders have been removed.' });
        });
    }
  };

  const handleDeleteSingle = (orderId) => {
    const orderRef = ref(database, `${WHATSAPP_SHEETS_REF}/${activeSheetId}/orders/${orderId}`);
    remove(orderRef).then(() => {
      toast({ title: 'Order Deleted', description: 'The order has been removed.' });
      setSelectedRows(prev => {
        const newSelection = new Set(prev);
        newSelection.delete(orderId);
        return newSelection;
      });
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
  
    try {
      const updates = {};
      selectedRows.forEach(id => {
        updates[`${WHATSAPP_SHEETS_REF}/${activeSheetId}/orders/${id}`] = null;
      });
      await update(ref(database), updates);
      toast({ title: `${selectedRows.size} Order(s) Deleted`, description: 'The selected orders have been removed.' });
      setSelectedRows(new Set());
    } catch (error) {
      toast({ title: 'Error Deleting Orders', description: 'Could not delete the selected orders.', variant: 'destructive' });
    }
  };

  const handleMoveOrder = (order) => {
    onMoveOrder(order);
    const orderRef = ref(database, `${WHATSAPP_SHEETS_REF}/${activeSheetId}/orders/${order.id}`);
    remove(orderRef);
    toast({
      title: "Order Moved",
      description: `Order ${order.ref} has been moved to the main orders table.`
    });
  };

  const handleMoveSelected = () => {
    if (selectedRows.size === 0) return;
    const ordersToMove = filteredOrders.filter(o => selectedRows.has(o.id));
    const updates = {};
    ordersToMove.forEach(order => {
        onMoveOrder(order);
        updates[`${WHATSAPP_SHEETS_REF}/${activeSheetId}/orders/${order.id}`] = null;
    });
    update(ref(database), updates);
    toast({
      title: `${ordersToMove.length} Order(s) Moved`,
      description: 'The selected orders have been moved to the main orders table.'
    });
    setSelectedRows(new Set());
  };

  const handleSelectionChange = (orderId) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(orderId)) {
        newSelection.delete(orderId);
      } else {
        newSelection.add(orderId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allOrderIds = new Set(filteredOrders.map(o => o.id));
      setSelectedRows(allOrderIds);
    } else {
      setSelectedRows(new Set());
    }
  };
  
  const handleExport = () => {
    const ordersToExport = selectedRows.size > 0
      ? filteredOrders.filter(o => selectedRows.has(o.id))
      : filteredOrders;
  
    if (ordersToExport.length === 0) {
      toast({ title: 'No Data', description: 'There are no orders to export.', variant: 'destructive' });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(ordersToExport);
    const workbook = XLSX.utils.book_new();
    const sheetName = sheets[activeSheetId]?.name || 'WhatsApp Orders';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}.xlsx`);
    toast({ title: 'Export Successful', description: `Exported ${ordersToExport.length} orders from ${sheetName}.` });
  };
  
  const handleImport = async (file) => {
    if (!activeSheetId) {
      toast({ title: 'Import Failed', description: 'Please select a sheet first.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
  
        const newOrders = json.map(row => ({ ...row, id: row.id || uuidv4() }));
  
        const sheetOrdersRef = ref(database, `${WHATSAPP_SHEETS_REF}/${activeSheetId}/orders`);
        const snapshot = await get(sheetOrdersRef);
        const existingOrders = snapshot.val() || {};
        const newOrdersObject = newOrders.reduce((acc, order) => {
          acc[order.id] = order;
          return acc;
        }, {});
        await set(sheetOrdersRef, { ...existingOrders, ...newOrdersObject });
        toast({ title: 'Import Successful', description: `Imported ${newOrders.length} orders into ${sheets[activeSheetId].name}.` });
  
      } catch (error) {
        toast({ title: 'Import Failed', description: 'Could not parse the file.', variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
  };
  
  useEffect(() => {
    const exportHandler = () => handleExport();
    const importHandler = (event) => handleImport(event.detail);
  
    document.addEventListener('exportWhatsAppOrders', exportHandler);
    document.addEventListener('importWhatsAppOrders', importHandler);
  
    return () => {
      document.removeEventListener('exportWhatsAppOrders', exportHandler);
      document.removeEventListener('importWhatsAppOrders', importHandler);
    };
  }, [sheets, activeSheetId, selectedRows, searchTerm, dateFilter]);

  const currentOrders = useMemo(() => {
    if (!activeSheetId || !sheets[activeSheetId] || !sheets[activeSheetId].orders) {
      return [];
    }
    return Object.values(sheets[activeSheetId].orders);
  }, [activeSheetId, sheets]);

  const filteredOrders = useMemo(() => {
    let filtered = [...currentOrders];

    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(order => {
            const orderString = JSON.stringify(order).toLowerCase();
            return orderString.includes(lowercasedTerm);
        });
    }

    // old date filter logic with Select input box
    /*if (dateFilter !== 'all') {
        const now = new Date();
        let filterDate = new Date();
        if (dateFilter === 'today') {
            filterDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'week') {
            filterDate.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
            filterDate.setDate(now.getDate() - 30);
        }

        filtered = filtered.filter(order => {
            if (!order.date || !/^\d{2}\/\d{2}\/\d{2,4}$/.test(order.date)) return false;
            const [day, month, year] = order.date.split('/');
            const orderDate = new Date(`${year.length === 2 ? '20' + year : year}-${month}-${day}`);
            return orderDate >= filterDate;
        });
    }*/
    
    if (dateFilter?.from) {
      const fromDate = new Date(dateFilter.from);
      fromDate.setHours(0, 0, 0, 0);
      
      const toDate = dateFilter.to ? new Date(dateFilter.to) : new Date(dateFilter.from);
      toDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        if (!order.date || !/^\d{2}\/\d{2}\/\d{2,4}$/.test(order.date)) return false;
        
        const [day, month, year] = order.date.split('/');
        const orderDate = new Date(`${year.length === 2 ? '20' + year : year}-${month}-${day}`);
        
        return orderDate >= fromDate && orderDate <= toDate;
      });
    }

    return filtered.sort((a, b) => {
      try {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateB - dateA;
      } catch (e) {
        return 0;
      }
    });
  }, [currentOrders, searchTerm, dateFilter]);
  
  const phoneNumbersCount = useMemo(() => {
    const counts = {};
    currentOrders.forEach(order => {
      const phone = order?.mobile?.replace(/\D/g, '');
      if (phone) {
        counts[phone] = (counts[phone] || 0) + 1;
      }
    });
    return counts;
  }, [currentOrders]);
  
  useEffect(() => {
    setSelectedRows(new Set());
  }, [activeSheetId]);

  const isAllSelected = selectedRows.size > 0 && selectedRows.size === filteredOrders.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < filteredOrders.length;

  const handleFieldSave = (orderId, data) => {
    const orderDataRef = ref(database, `${WHATSAPP_SHEETS_REF}/${activeSheetId}/orders/${orderId}`);
    return update(orderDataRef, data);
  };

  const handleSaveNewOrder = async (newOrderData) => {
    if (!activeSheetId) {
      toast({ title: 'Error', description: 'No active sheet selected.', variant: 'destructive' });
      return;
    }
    const newId = uuidv4();
    const orderWithId = { ...newOrderData, id: newId };
    const newOrderRef = ref(database, `${WHATSAPP_SHEETS_REF}/${activeSheetId}/orders/${newId}`);
    try {
      await set(newOrderRef, orderWithId);
      toast({ title: 'Order Saved', description: 'New order has been added successfully.' });
      setIsAddingOrder(false);
    } catch (error) {
      toast({ title: 'Error Saving Order', description: error.message, variant: 'destructive' });
    }
  };

  const totalOrdersInDB = useMemo(() => {
    return Object.values(sheets).reduce((sum, sheet) => sum + Object.keys(sheet.orders || {}).length, 0);
  }, [sheets]);

  const resetFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
  };

  const dateFilters = useMemo(() => [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
  ], []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" />
            <CardTitle>Paste WhatsApp Messages</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Paste your WhatsApp order messages here to add them to "${sheets[activeSheetId]?.name || ''}"...`}
            rows={8}
            disabled={!activeSheetId}
          />
          <div className="flex gap-2">
            <Button onClick={handleParse} disabled={!activeSheetId}>
              <FileUp className="h-4 w-4 mr-2" />
              Parse to current sheet
            </Button>
            <Button variant="outline" onClick={handleClearInput}>Clear Input</Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-3 gap-4 text-center">
        <Card>
            <CardContent className="p-4">
                <p className="text-2xl font-bold">{filteredOrders.length}</p>
                <p className="text-sm text-muted-foreground">Orders in "{sheets[activeSheetId]?.name || '...'}"</p>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4">
                <p className="text-2xl font-bold">{totalOrdersInDB}</p>
                <p className="text-sm text-muted-foreground">Total Stored Orders</p>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4">
                <p className="text-2xl font-bold">{Object.keys(sheets).length}</p>
                <p className="text-sm text-muted-foreground">Total Sheets</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-primary" />
              <CardTitle>Parsed Orders</CardTitle>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button onClick={() => setIsAddingOrder(true)} disabled={!activeSheetId || isAddingOrder}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Order
              </Button>
              {selectedRows.size > 0 && (
                <>
                  <Button onClick={handleMoveSelected}>
                    <Send className="h-4 w-4 mr-2" />
                    Move ({selectedRows.size})
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteSelected}>
                    <Trash className="h-4 w-4 mr-2" />
                    Delete ({selectedRows.size})
                  </Button>
                </>
              )}
              <Button variant="destructive" onClick={handleClearDatabase}>
                <ShieldAlert className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <motion.div
            className="overflow-hidden rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SheetTabs 
              sheets={sheets} 
              activeSheetId={activeSheetId}
              onSelectSheet={setActiveSheetId}
              onAddSheet={handleAddSheet}
              onRenameSheet={handleRenameSheet}
              onDeleteSheet={handleDeleteSheet}
            />
            <div className="p-4 border-b">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4 w-full lg:w-auto">
                        <DateRangePicker date={dateFilter} onDateChange={setDateFilter} />
                        {/*<Select value={dateFilter} onValueChange={setDateFilter}>
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
                        </Select>*/}
                        <Button variant="outline" onClick={resetFilters}>Reset</Button>
                    </div>
                </div>
                <div className="text-right mt-2 text-sm text-muted-foreground">
                    Showing {filteredOrders.length} of {currentOrders.length} orders
                </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        data-state={isIndeterminate ? 'indeterminate' : (isAllSelected ? 'checked' : 'unchecked')}
                      />
                    </TableHead>
                    <TableHead>Ref#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Item(s)</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Special Note</TableHead>
                    <TableHead>Important Note</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAddingOrder && <NewOrderRow onSave={handleSaveNewOrder} onCancel={() => setIsAddingOrder(false)} />}
                  {filteredOrders.length > 0 ? filteredOrders.map(order => {
                    const phone = order?.mobile?.replace(/\D/g, '');
                    const isDuplicate = phone && phoneNumbersCount[phone] > 1;
                    return (
                      <TableRow key={order.id} data-state={selectedRows.has(order.id) ? "selected" : undefined} className={`${isDuplicate ? 'bg-red-500/10' : ''}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(order.id)}
                            onCheckedChange={() => handleSelectionChange(order.id)}
                          />
                        </TableCell>
                        <TableCell><EditableField initialValue={order.ref} onSave={handleFieldSave} fieldName="ref" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.date} onSave={handleFieldSave} fieldName="date" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.name} onSave={handleFieldSave} fieldName="name" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.mobile} onSave={handleFieldSave} fieldName="mobile" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.address} onSave={handleFieldSave} fieldName="address" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.city} onSave={handleFieldSave} fieldName="city" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.items} onSave={handleFieldSave} fieldName="items" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.price} onSave={handleFieldSave} fieldName="price" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.delivery} onSave={handleFieldSave} fieldName="delivery" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.totalPayment} onSave={handleFieldSave} fieldName="totalPayment" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.note} onSave={handleFieldSave} fieldName="note" orderId={order.id} /></TableCell>
                        <TableCell><EditableField initialValue={order.importantNote} onSave={handleFieldSave} fieldName="importantNote" orderId={order.id} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleMoveOrder(order)} title="Move to Orders">
                              <Send className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSingle(order.id)} title="Delete Order">
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  }) : (
                    !isAddingOrder && (
                      <TableRow>
                        <TableCell colSpan={14} className="h-24 text-center">
                          No orders match your filters.
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppOrders;