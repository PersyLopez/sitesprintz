import React, { createContext, useState, useEffect } from 'react';
import { isPurchasable, remainingStock } from '../utils/productAvailability';

export const CartContext = createContext();

const DEFAULT_CART_KEY = 'sitesprintz_cart';

function getCartStorageKey(siteId) {
  return siteId ? `${DEFAULT_CART_KEY}_${siteId}` : DEFAULT_CART_KEY;
}

export function CartProvider({ children, siteId = null }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartKey = getCartStorageKey(siteId);

  // Load site-scoped cart from localStorage on mount / site change
  useEffect(() => {
    const savedCart = localStorage.getItem(cartKey);
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart:', error);
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }
  }, [cartKey]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
  }, [cartItems, cartKey]);

  // Add item to cart
  const addToCart = (product, quantity = 1, options = {}) => {
    if (!isPurchasable(product)) {
      return;
    }

    const maxQty = remainingStock(product);

    setCartItems(prevItems => {
      const existingIndex = prevItems.findIndex(
        item => item.id === product.id && JSON.stringify(item.options) === JSON.stringify(options)
      );

      if (existingIndex >= 0) {
        const updated = [...prevItems];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex].quantity = maxQty != null
          ? Math.min(newQty, maxQty)
          : newQty;
        return updated;
      }

      const safeQty = maxQty != null ? Math.min(quantity, maxQty) : quantity;
      if (safeQty <= 0) {
        return prevItems;
      }

      return [...prevItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: safeQty,
        stock: maxQty,
        options
      }];
    });
  };

  // Update item quantity
  const updateQuantity = (itemId, quantity, options = {}) => {
    if (quantity <= 0) {
      removeFromCart(itemId, options);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== itemId || JSON.stringify(item.options) !== JSON.stringify(options)) {
          return item;
        }
        const capped = item.stock != null ? Math.min(quantity, item.stock) : quantity;
        return { ...item, quantity: capped };
      })
    );
  };

  // Remove item from cart
  const removeFromCart = (itemId, options = {}) => {
    setCartItems(prevItems =>
      prevItems.filter(
        item => !(item.id === itemId && JSON.stringify(item.options) === JSON.stringify(options))
      )
    );
  };

  // Clear entire cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Get cart totals
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const getItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const value = {
    cartItems,
    items: cartItems,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    addItem: addToCart,
    updateQuantity,
    removeFromCart,
    removeItem: removeFromCart,
    clearCart,
    getCartTotal,
    getItemCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

