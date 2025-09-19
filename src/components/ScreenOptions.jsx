import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings2 } from 'lucide-react';

const ScreenOptions = ({ visibleColumns, onColumnChange, itemsPerPage, onItemsPerPageChange }) => {
    const allColumns = [
        { id: 'order', label: 'Order' },
        { id: 'date', label: 'Date' },
        { id: 'ref', label: 'Reference' },
        { id: 'status', label: 'Status' },
        { id: 'billing', label: 'Billing' },
        { id: 'shipping', label: 'Ship to' },
        { id: 'items', label: 'Items & Notes' },
        { id: 'payment', label: 'Payment' },
        { id: 'total', label: 'Total' },
        { id: 'actions', label: 'Actions' },
    ];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className={"w-48"}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Screen Options
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <p className="font-medium text-sm">Columns</p>
                        <div className="grid grid-cols-2 gap-2">
                            {allColumns.map((col) => (
                                <div key={col.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`col-${col.id}`}
                                        checked={visibleColumns[col.id]}
                                        onCheckedChange={(checked) => onColumnChange(col.id, checked)}
                                    />
                                    <Label htmlFor={`col-${col.id}`} className="text-sm font-normal">
                                        {col.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                         <p className="font-medium text-sm">Pagination</p>
                         <div className="flex items-center gap-2">
                            <Label htmlFor="items-per-page" className="text-sm font-normal whitespace-nowrap">
                                Number of items per page:
                            </Label>
                            <Input
                                id="items-per-page"
                                type="number"
                                min="1"
                                max="100"
                                value={itemsPerPage}
                                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                                className="h-8 w-20"
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ScreenOptions;