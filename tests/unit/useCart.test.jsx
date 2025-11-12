import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCart } from '../../src/hooks/useCart';
import { CartContext } from '../../src/context/CartContext';

describe('useCart Hook', () => {
  describe('Context Usage', () => {
    it('should return context value when used within CartProvider', () => {
      const mockCartValue = {
        items: [{ id: '1', name: 'Product 1', price: 29.99, quantity: 1 }],
        addItem: () => {},
        removeItem: () => {},
        updateQuantity: () => {},
        clearCart: () => {},
        total: 29.99,
        itemCount: 1
      };

      const wrapper = ({ children }) => (
        <CartContext.Provider value={mockCartValue}>
          {children}
        </CartContext.Provider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current).toBe(mockCartValue);
      expect(result.current.items).toEqual(mockCartValue.items);
      expect(result.current.total).toBe(29.99);
      expect(result.current.itemCount).toBe(1);
    });

    it('should throw error when used outside CartProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCart());
      }).toThrow('useCart must be used within a CartProvider');

      consoleSpy.mockRestore();
    });

    it('should throw error with correct message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        renderHook(() => useCart());
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('useCart must be used within a CartProvider');
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Context Values', () => {
    it('should pass through all cart properties', () => {
      const mockCartValue = {
        items: [
          { id: '1', name: 'Product 1', price: 19.99, quantity: 2 },
          { id: '2', name: 'Product 2', price: 39.99, quantity: 1 }
        ],
        addItem: vi.fn(),
        removeItem: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart: vi.fn(),
        total: 79.97,
        itemCount: 3,
        isOpen: false,
        toggleCart: vi.fn()
      };

      const wrapper = ({ children }) => (
        <CartContext.Provider value={mockCartValue}>
          {children}
        </CartContext.Provider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toEqual(mockCartValue.items);
      expect(result.current.addItem).toBe(mockCartValue.addItem);
      expect(result.current.removeItem).toBe(mockCartValue.removeItem);
      expect(result.current.updateQuantity).toBe(mockCartValue.updateQuantity);
      expect(result.current.clearCart).toBe(mockCartValue.clearCart);
      expect(result.current.total).toBe(mockCartValue.total);
      expect(result.current.itemCount).toBe(mockCartValue.itemCount);
      expect(result.current.isOpen).toBe(mockCartValue.isOpen);
      expect(result.current.toggleCart).toBe(mockCartValue.toggleCart);
    });

    it('should handle empty cart', () => {
      const mockCartValue = {
        items: [],
        addItem: vi.fn(),
        removeItem: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart: vi.fn(),
        total: 0,
        itemCount: 0
      };

      const wrapper = ({ children }) => (
        <CartContext.Provider value={mockCartValue}>
          {children}
        </CartContext.Provider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
    });

    it('should handle cart with multiple items', () => {
      const items = [
        { id: '1', name: 'Item 1', price: 10.00, quantity: 3 },
        { id: '2', name: 'Item 2', price: 20.00, quantity: 2 },
        { id: '3', name: 'Item 3', price: 15.00, quantity: 1 }
      ];

      const mockCartValue = {
        items,
        addItem: vi.fn(),
        removeItem: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart: vi.fn(),
        total: 85.00, // (10*3) + (20*2) + (15*1)
        itemCount: 6 // 3 + 2 + 1
      };

      const wrapper = ({ children }) => (
        <CartContext.Provider value={mockCartValue}>
          {children}
        </CartContext.Provider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items.length).toBe(3);
      expect(result.current.total).toBe(85.00);
      expect(result.current.itemCount).toBe(6);
    });
  });
});


