import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../src/context/ToastContext';
import { SiteProvider } from '../src/context/SiteContext';

/**
 * Test wrapper that provides all necessary context providers
 * Usage: wrapper: AllProvidersWrapper
 */
export function AllProvidersWrapper({ children }) {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SiteProvider>
          {children}
        </SiteProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

/**
 * Test wrapper with only Toast and Site providers (no Router)
 * Usage: wrapper: ProviderWrapper
 */
export function ProviderWrapper({ children }) {
  return (
    <ToastProvider>
      <SiteProvider>
        {children}
      </SiteProvider>
    </ToastProvider>
  );
}

/**
 * Test wrapper with only Toast provider
 * Usage: wrapper: ToastWrapper
 */
export function ToastWrapper({ children }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}

/**
 * Test wrapper with only Router
 * Usage: wrapper: RouterWrapper
 */
export function RouterWrapper({ children }) {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}

export default {
  AllProvidersWrapper,
  ProviderWrapper,
  ToastWrapper,
  RouterWrapper,
};

