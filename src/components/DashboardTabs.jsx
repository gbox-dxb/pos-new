import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrdersTable from '@/components/OrdersTable';
import StoresList from '@/components/StoresList';
import TopProducts from '@/components/TopProducts';
import WhatsAppOrders from '@/components/WhatsAppOrders';
import StockManager from '@/components/StockManager';
import Tracking from '@/components/Tracking';
import AccessManager from '@/components/AccessManager';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import OrderStats from '@/components/OrderStats';
import FilterControls from '@/components/FilterControls';
import { useAccessControl } from '@/contexts/AccessControlContext';

const DashboardTabs = ({
    stores,
    orders,
    trashedOrders,
    loading,
    onSync,
    onAddStore,
    onEditStore,
    onDeleteStore,
    onUpdateOrders,
    isUpdatingOrders,
    onUpdateOrderDetails,
    isUpdatingDetails,
    screenOptions,
    selectedRows,
    setSelectedRows,
    activeTab,
    setActiveTab,
    onMoveWhatsAppOrder,
    onUpdateWhatsAppOrder,
    onTrashSelectedOrders,
    onDeletePermanently,
    tabOrder,
    setTabOrder,
    sortedOrders,
    setFilteredOrders,
    onScreenOptionsChange,
}) => {
    const { permissions, isAdmin } = useAccessControl();

    const onDragEnd = (result) => {
        if (!result.destination || !isAdmin) return;
        const items = Array.from(tabOrder);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setTabOrder(items);
    };

    const tabDetails = {
        orders: { label: 'Orders' },
        trashed: { label: `Trashed (${trashedOrders.length})` },
        stock: { label: 'Stock Manager' },
        stores: { label: `Stores (${stores.length})` },
        products: { label: 'Top Products' },
        whatsapp: { label: 'WhatsApp Orders' },
        tracking: { label: 'Tracking' },
        'access-manager': { label: 'Access Manager' },
    };

    const visibleTabs = tabOrder.filter(tabId => permissions.tabs[tabId] && permissions.tabs[tabId] !== 'none');

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="tabs" direction="horizontal" isDropDisabled={!isAdmin}>
                    {(provided) => (
                        <TabsList
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`grid w-full h-auto grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-${visibleTabs.length}`}
                        >
                            {visibleTabs.map((tabId, index) => (
                                <Draggable key={tabId} draggableId={tabId} index={index} isDragDisabled={!isAdmin}>
                                    {(provided) => (
                                        <TabsTrigger
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            value={tabId}
                                            className="w-full"
                                        >
                                            {tabDetails[tabId]?.label || tabId}
                                        </TabsTrigger>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </TabsList>
                    )}
                </Droppable>
            </DragDropContext>
            
            {permissions.tabs.orders !== 'none' && <TabsContent value="orders">
                <div className="space-y-6">
                    <OrderStats orders={orders} />
                    <FilterControls
                        orders={sortedOrders}
                        stores={stores}
                        onFilterChange={setFilteredOrders}
                        filteredCount={orders.length}
                        screenOptions={screenOptions}
                        onScreenOptionsChange={onScreenOptionsChange}
                    />
                    <Card>
                        <CardContent className="p-0">
                            <OrdersTable
                                orders={orders}
                                loading={loading}
                                onUpdateOrders={onUpdateOrders}
                                isUpdatingOrders={isUpdatingOrders}
                                stores={stores}
                                onUpdateOrderDetails={onUpdateOrderDetails}
                                isUpdatingDetails={isUpdatingDetails}
                                screenOptions={screenOptions}
                                selectedRows={selectedRows}
                                setSelectedRows={setSelectedRows}
                                onTrashSelected={onTrashSelectedOrders}
                            />
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>}
            
            {permissions.tabs.trashed !== 'none' && <TabsContent value="trashed">
                <Card>
                    <CardContent className="p-0">
                        <OrdersTable
                            orders={trashedOrders}
                            loading={loading}
                            onUpdateOrders={onUpdateOrders}
                            isUpdatingOrders={isUpdatingOrders}
                            stores={stores}
                            onUpdateOrderDetails={onUpdateOrderDetails}
                            isUpdatingDetails={isUpdatingDetails}
                            screenOptions={screenOptions}
                            selectedRows={selectedRows}
                            setSelectedRows={setSelectedRows}
                            onTrashSelected={onTrashSelectedOrders}
                            onDeletePermanently={onDeletePermanently}
                            isTrashView={true}
                        />
                    </CardContent>
                </Card>
            </TabsContent>}

            {permissions.tabs.stock !== 'none' && <TabsContent value="stock">
                <StockManager stores={stores} />
            </TabsContent>}

            {permissions.tabs.stores !== 'none' && <TabsContent value="stores">
                <Card>
                    <CardContent className="p-4 md:p-6">
                        <StoresList
                            stores={stores}
                            loading={loading}
                            onSync={onSync}
                            onAddStore={onAddStore}
                            onEditStore={onEditStore}
                            onDeleteStore={onDeleteStore}
                        />
                    </CardContent>
                </Card>
            </TabsContent>}

            {permissions.tabs.products !== 'none' && <TabsContent value="products">
                <TopProducts orders={orders} stores={stores} />
            </TabsContent>}

            {permissions.tabs.whatsapp !== 'none' && <TabsContent value="whatsapp">
                <WhatsAppOrders onMoveOrder={onMoveWhatsAppOrder} onUpdateWhatsAppOrder={onUpdateWhatsAppOrder} />
            </TabsContent>}

            {permissions.tabs.tracking !== 'none' && <TabsContent value="tracking">
                <Tracking />
            </TabsContent>}

            {permissions.tabs['access-manager'] !== 'none' && <TabsContent value="access-manager">
                <AccessManager />
            </TabsContent>}
        </Tabs>
    );
};

export default DashboardTabs;