import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Clock, CheckCircle, XCircle, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';

const OrderStats = ({ orders = [], setStatusFilter }) => {
  const stats = React.useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const processingOrders = orders.filter(order => order.status === 'processing').length;
    const onholdOrders = orders.filter(order => order.status === 'on-hold').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const cancelledOrders = orders.filter(order => ['cancelled', 'failed', 'refunded'].includes(order.status)).length;

    return {
      totalOrders,
      pendingOrders,
      onholdOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
    };
  }, [orders]);

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    /*{
      title: 'Pending',
      value: stats.pendingOrders.toLocaleString(),
      icon: Clock,
      color: 'text-orange-500',
    },*/
    {
      title: 'Out for Delivery',
      value: stats.onholdOrders.toLocaleString(),
      icon: Clock,
      color: 'text-orange-500',
    },
    {
      title: 'Processing',
      value: stats.processingOrders.toLocaleString(),
      icon: Package,
      color: 'text-purple-500',
    },
    {
      title: 'Completed',
      value: stats.completedOrders.toLocaleString(),
      icon: CheckCircle,
      color: 'text-emerald-500',
    },
    {
      title: 'Cancelled',
      value: stats.cancelledOrders.toLocaleString(),
      icon: XCircle,
      color: 'text-red-500',
    }
  ];
  
  const handleStatsClick = ((stat) => {
    // picked from FilterControls.jsx
    const orderStatuses = [
      { value: 'all', label: 'All Statuses' },
      // { value: 'pending', label: 'Pending' },
      { value: 'processing', label: 'Processing' },
      { value: 'on-hold', label: 'Out for Delivery' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'refunded', label: 'Refunded' },
      { value: 'failed', label: 'Failed' },
    ];
    
    const match = orderStatuses.find(
      (s) => s.label.toLowerCase() === stat.title.toLowerCase()
    );
    if (match) {
      setStatusFilter(match.value);
    } else {
      setStatusFilter('all'); // default
    }
  })
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
          onClick={() => handleStatsClick(stat)}
        >
          <Card className="p-4 hover:shadow-md transition-shadow h-full cursor-pointer">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground mt-2 truncate">
              {stat.value}
            </p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default OrderStats;