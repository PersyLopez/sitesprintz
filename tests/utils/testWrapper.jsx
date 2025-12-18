/**
 * Comprehensive Test Wrapper for React Components
 * 
 * Provides all necessary context providers and utilities for component testing
 * Handles act() warnings, async operations, and context setup
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { MemoryRouter, BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { ToastProvider } from '../../src/context/ToastContext';
import { SiteProvider } from '../../src/context/SiteContext';
import { CartProvider } from '../../src/context/CartContext';

/**
 * Default mock values for contexts
 */
export const defaultMockValues = {
  auth: {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      plan: 'starter',
      subscription_status: null
    },
    token: 'test-token',
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn()
  },
  site: {
    siteData: {
      id: 'site-123',
      businessName: 'Test Business',
      template: 'restaurant',
      brand: { name: 'Test Business' },
      colors: { primary: '#06b6d4', secondary: '#14b8a6' }
    },
    updateField: vi.fn(),
    updateNestedField: vi.fn(),
    resetSite: vi.fn(),
    loading: false,
    previewKey: 0
  },
  cart: {
    cartItems: [],
    isCartOpen: false,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    getCartTotal: vi.fn(() => 0),
    getItemCount: vi.fn(() => 0),
    toggleCart: vi.fn()
  }
};

/**
 * All Providers Wrapper
 * Includes: Router, Auth, Toast, Site, Cart
 */
export function AllProvidersWrapper({ children, initialEntries = ['/'], routerType = 'memory' }) {
  const Router = routerType === 'memory' ? MemoryRouter : BrowserRouter;
  const routerProps = routerType === 'memory' ? { initialEntries } : {};

  return (
    <Router {...routerProps}>
      <AuthProvider>
        <ToastProvider>
          <SiteProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </SiteProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

/**
 * Auth + Toast Wrapper (most common)
 */
export function AuthToastWrapper({ children, initialEntries = ['/'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/**
 * Router Only Wrapper
 */
export function RouterWrapper({ children, initialEntries = ['/'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
}

/**
 * Render with all providers (handles act() automatically)
 */
export function renderWithAllProviders(
  component,
  {
    initialEntries = ['/'],
    routerType = 'memory',
    ...options
  } = {}
) {
  // Use regular render - act() should be used around user interactions, not render
  return render(
    <AllProvidersWrapper initialEntries={initialEntries} routerType={routerType}>
      {component}
    </AllProvidersWrapper>,
    options
  );
}

/**
 * Render with auth and toast (handles act() automatically)
 */
export function renderWithAuthToast(
  component,
  {
    initialEntries = ['/'],
    ...options
  } = {}
) {
  // Use regular render - act() should be used around user interactions, not render
  return render(
    <AuthToastWrapper initialEntries={initialEntries}>
      {component}
    </AuthToastWrapper>,
    options
  );
}

/**
 * Wait for async operations with act() wrapper
 */
export async function waitForAsync(callback, options = {}) {
  return await act(async () => {
    return await waitFor(callback, options);
  });
}

/**
 * Fire events wrapped in act()
 */
export function fireEventInAct(fireEvent, element, event) {
  act(() => {
    fireEvent(element, event);
  });
}

export default {
  AllProvidersWrapper,
  AuthToastWrapper,
  RouterWrapper,
  renderWithAllProviders,
  renderWithAuthToast,
  waitForAsync,
  fireEventInAct,
  defaultMockValues
};

