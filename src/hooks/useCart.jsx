import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook to manage shopping cart state
 * @returns {Object} Cart state and methods
 */
export function useCart() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse saved cart:', error);
      }
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('cart', JSON.stringify(items));
    } else {
      localStorage.removeItem('cart');
    }
  }, [items]);
  
  const addItem = (item) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      
      if (existingIndex >= 0) {
        // Update quantity if item exists
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: (updated[existingIndex].quantity || 1) + (item.quantity || 1),
        };
        return updated;
      }
      
      // Add new item
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };
  
  const removeItem = (itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };
  
  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };
  
  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('cart');
  };
  
  const total = items.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );
  
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  return {
    items,
    itemCount,
    total,
    loading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setLoading,
  };
}

export default useCart;

