import { useState } from 'react';
import type { Order } from '../types';

export const useOrderOperations = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Mock order status update function - in real implementation, this would call API
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      // In real implementation, this would call the API
      console.log('Updating order status:', orderId, 'to:', newStatus);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err) {
      console.error('Failed to update order status', err);
      setError('Unable to update order status right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const assignAgentToOrder = async (orderId: string, agentId: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      // In real implementation, this would call the API
      console.log('Assigning agent to order:', orderId, 'agent:', agentId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, delivery_agent_id: agentId } : order
        )
      );
    } catch (err) {
      console.error('Failed to assign agent to order', err);
      setError('Unable to assign delivery agent right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = ['Pending', 'Accepted', 'Preparing', 'Out for Delivery', 'Delivered'];
    const currentIndex = statusFlow.indexOf(currentStatus);
    
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
      return null;
    }
    
    return statusFlow[currentIndex + 1];
  };

  const canUpdateStatus = (status: string) => {
    return status !== 'Delivered' && status !== 'Rejected' && status !== 'Cancelled';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Pending': '#ff9500',
      'Accepted': '#10b981',
      'Preparing': '#3b82f6',
      'Out for Delivery': '#f59e0b',
      'Delivered': '#10b981',
      'Rejected': '#ef4444',
      'Cancelled': '#6b7280',
    };
    
    return colors[status as keyof typeof colors] || '#666';
  };

  return {
    orders,
    isLoading,
    error,
    updateOrderStatus,
    assignAgentToOrder,
    getNextStatus,
    canUpdateStatus,
    getStatusColor,
    setOrders,
  };
};
