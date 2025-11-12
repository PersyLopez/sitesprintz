import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, CartContext } from '../../src/context/CartContext';
import { useContext } from 'react';

describe('CartContext', () => {
  // Helper to render hook with provider
  const renderCartHook = () => {
    return renderHook(() => useContext(CartContext), {
      wrapper: CartProvider,
    });
  };

  // Mock localStorage
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => {
        store[key] = value.toString();
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    global.localStorage = localStorageMock;
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  const mockProduct = {
    id: 'prod-1',
    name: 'Test Product',
    price: 29.99,
    image: '/images/test.jpg',
  };

  const mockProduct2 = {
    id: 'prod-2',
    name: 'Another Product',
    price: 49.99,
    image: '/images/test2.jpg',
  };

  describe('Initial State', () => {
    it('should provide cart context', () => {
      const { result } = renderCartHook();

      expect(result.current).toBeDefined();
      expect(result.current.cartItems).toEqual([]);
      expect(result.current.isCartOpen).toBe(false);
    });

    it('should have all cart methods', () => {
      const { result } = renderCartHook();

      expect(typeof result.current.addToCart).toBe('function');
      expect(typeof result.current.updateQuantity).toBe('function');
      expect(typeof result.current.removeFromCart).toBe('function');
      expect(typeof result.current.clearCart).toBe('function');
      expect(typeof result.current.getCartTotal).toBe('function');
      expect(typeof result.current.getItemCount).toBe('function');
    });

    it('should load cart from localStorage on mount', () => {
      const savedCart = [
        { id: 'prod-1', name: 'Test', price: 10, quantity: 2, options: {} },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart));

      const { result } = renderCartHook();

      expect(result.current.cartItems).toEqual(savedCart);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('sitesprintz_cart');
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderCartHook();

      expect(result.current.cartItems).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Add to Cart', () => {
    it('should add new item to cart', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
      });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0]).toMatchObject({
        id: 'prod-1',
        name: 'Test Product',
        price: 29.99,
        quantity: 1,
      });
    });

    it('should add multiple items', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.addToCart(mockProduct2, 2);
      });

      expect(result.current.cartItems).toHaveLength(2);
      expect(result.current.getItemCount()).toBe(3);
    });

    it('should increase quantity for existing item', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.addToCart(mockProduct, 2);
      });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0].quantity).toBe(3);
    });

    it('should handle item with options', () => {
      const { result } = renderCartHook();
      const options = { size: 'Large', color: 'Blue' };

      act(() => {
        result.current.addToCart(mockProduct, 1, options);
      });

      expect(result.current.cartItems[0].options).toEqual(options);
    });

    it('should treat items with different options as separate', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1, { size: 'Small' });
        result.current.addToCart(mockProduct, 1, { size: 'Large' });
      });

      expect(result.current.cartItems).toHaveLength(2);
    });

    it('should open cart temporarily after adding', async () => {
      vi.useFakeTimers();
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
      });

      expect(result.current.isCartOpen).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.isCartOpen).toBe(false);
      vi.useRealTimers();
    });

    it('should save to localStorage after adding', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sitesprintz_cart',
        expect.stringContaining('prod-1')
      );
    });
  });

  describe('Update Quantity', () => {
    it('should update item quantity', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.updateQuantity('prod-1', 5);
      });

      expect(result.current.cartItems[0].quantity).toBe(5);
    });

    it('should remove item when quantity is 0', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.updateQuantity('prod-1', 0);
      });

      expect(result.current.cartItems).toHaveLength(0);
    });

    it('should remove item when quantity is negative', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.updateQuantity('prod-1', -1);
      });

      expect(result.current.cartItems).toHaveLength(0);
    });

    it('should update quantity for item with specific options', () => {
      const { result } = renderCartHook();
      const options = { size: 'Large' };

      act(() => {
        result.current.addToCart(mockProduct, 1, options);
        result.current.updateQuantity('prod-1', 3, options);
      });

      expect(result.current.cartItems[0].quantity).toBe(3);
    });
  });

  describe('Remove from Cart', () => {
    it('should remove item from cart', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.removeFromCart('prod-1');
      });

      expect(result.current.cartItems).toHaveLength(0);
    });

    it('should remove only specified item', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.addToCart(mockProduct2, 1);
        result.current.removeFromCart('prod-1');
      });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0].id).toBe('prod-2');
    });

    it('should remove item with specific options', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1, { size: 'Small' });
        result.current.addToCart(mockProduct, 1, { size: 'Large' });
        result.current.removeFromCart('prod-1', { size: 'Small' });
      });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0].options.size).toBe('Large');
    });
  });

  describe('Clear Cart', () => {
    it('should clear all items from cart', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.addToCart(mockProduct2, 2);
        result.current.clearCart();
      });

      expect(result.current.cartItems).toHaveLength(0);
    });

    it('should save empty cart to localStorage', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.clearCart();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sitesprintz_cart',
        '[]'
      );
    });
  });

  describe('Cart Calculations', () => {
    it('should calculate cart total correctly', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 2); // 2 × $29.99
        result.current.addToCart(mockProduct2, 1); // 1 × $49.99
      });

      const total = result.current.getCartTotal();
      expect(total).toBeCloseTo(109.97, 2);
    });

    it('should return 0 for empty cart', () => {
      const { result } = renderCartHook();

      expect(result.current.getCartTotal()).toBe(0);
    });

    it('should calculate item count correctly', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 2);
        result.current.addToCart(mockProduct2, 3);
      });

      expect(result.current.getItemCount()).toBe(5);
    });

    it('should return 0 count for empty cart', () => {
      const { result } = renderCartHook();

      expect(result.current.getItemCount()).toBe(0);
    });

    it('should update total when quantity changes', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
        result.current.updateQuantity('prod-1', 5);
      });

      const total = result.current.getCartTotal();
      expect(total).toBeCloseTo(149.95, 2);
    });
  });

  describe('Cart Visibility', () => {
    it('should toggle cart open state', () => {
      const { result } = renderCartHook();

      expect(result.current.isCartOpen).toBe(false);

      act(() => {
        result.current.setIsCartOpen(true);
      });

      expect(result.current.isCartOpen).toBe(true);

      act(() => {
        result.current.setIsCartOpen(false);
      });

      expect(result.current.isCartOpen).toBe(false);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save cart to localStorage on changes', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 1);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sitesprintz_cart',
        expect.any(String)
      );
    });

    it('should persist cart data correctly', () => {
      const { result } = renderCartHook();

      act(() => {
        result.current.addToCart(mockProduct, 2);
      });

      const savedData = localStorageMock.setItem.mock.calls[
        localStorageMock.setItem.mock.calls.length - 1
      ][1];
      const parsedData = JSON.parse(savedData);

      expect(parsedData).toHaveLength(1);
      expect(parsedData[0].id).toBe('prod-1');
      expect(parsedData[0].quantity).toBe(2);
    });
  });
});

