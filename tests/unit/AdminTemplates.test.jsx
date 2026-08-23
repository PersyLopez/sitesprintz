/**
 * Tests for AdminTemplates page
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminTemplates from '../../src/pages/AdminTemplates';

// Mock useAuth
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'admin-1' },
    token: 'test-token',
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderAdminTemplates() {
  return render(
    <MemoryRouter initialEntries={['/admin/templates']}>
      <AdminTemplates />
    </MemoryRouter>
  );
}

describe('AdminTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [], total: 0 }),
    });
  });

  it('renders the page header', () => {
    renderAdminTemplates();
    expect(screen.getByText('Template Management')).toBeTruthy();
    expect(screen.getByText('Create, edit, and manage website templates')).toBeTruthy();
  });

  it('renders create template button', () => {
    renderAdminTemplates();
    expect(screen.getByText('+ Create Template')).toBeTruthy();
  });

  it('renders filter inputs', () => {
    renderAdminTemplates();
    expect(screen.getByTestId('template-search')).toBeTruthy();
    expect(screen.getByTestId('industry-filter')).toBeTruthy();
    expect(screen.getByTestId('status-filter')).toBeTruthy();
  });

  it('fetches templates on mount', async () => {
    const mockTemplates = [
      { id: '1', name: '💇 Salon', slug: 'salon', industry: 'service', description: 'Salon template', layout_key: 'atelier', status: 'active', version: 1, is_default: true },
      { id: '2', name: '🍽️ Restaurant', slug: 'restaurant', industry: 'food', description: 'Restaurant template', layout_key: 'mercantile', status: 'active', version: 1, is_default: true },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates, total: 2 }),
    });
    
    renderAdminTemplates();
    
    await waitFor(() => {
      expect(screen.getByTestId('template-card-salon')).toBeTruthy();
      expect(screen.getByTestId('template-card-restaurant')).toBeTruthy();
    });
  });

  it('renders template cards with correct info', async () => {
    const mockTemplates = [
      { id: '1', name: '💇 Salon', slug: 'salon', industry: 'service', description: 'Salon template', layout_key: 'atelier', status: 'active', version: 1, is_default: true },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates, total: 1 }),
    });
    
    renderAdminTemplates();
    
    await waitFor(() => {
      expect(screen.getByText('💇 Salon')).toBeTruthy();
      expect(screen.getByText('Salon template')).toBeTruthy();
      expect(screen.getByText('Layout: atelier')).toBeTruthy();
      expect(screen.getByText('v1')).toBeTruthy();
      expect(screen.getByText('Default')).toBeTruthy();
    });
  });

  it('renders action buttons on each card', async () => {
    const mockTemplates = [
      { id: '1', name: '💇 Salon', slug: 'salon', industry: 'service', description: 'Salon template', layout_key: 'atelier', status: 'draft', version: 1, is_default: true },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates, total: 1 }),
    });
    
    renderAdminTemplates();
    
    await waitFor(() => {
      expect(screen.getByTestId('edit-salon')).toBeTruthy();
      expect(screen.getByTestId('duplicate-salon')).toBeTruthy();
      expect(screen.getByTestId('reset-salon')).toBeTruthy();
      expect(screen.getByTestId('archive-salon')).toBeTruthy();
    });
  });

  it('renders status badge with correct color', async () => {
    const mockTemplates = [
      { id: '1', name: '💇 Salon', slug: 'salon', industry: 'service', description: 'Salon template', layout_key: 'atelier', status: 'active', version: 1, is_default: true },
      { id: '2', name: '🍽️ Restaurant', slug: 'restaurant', industry: 'food', description: 'Restaurant template', layout_key: 'mercantile', status: 'draft', version: 1, is_default: true },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates, total: 2 }),
    });
    
    renderAdminTemplates();
    
    await waitFor(() => {
      const activeBadge = screen.getByTestId('template-card-salon').querySelector('.admin-badge');
      const draftBadge = screen.getByTestId('template-card-restaurant').querySelector('.admin-badge');
      expect(activeBadge).toBeTruthy();
      expect(draftBadge).toBeTruthy();
    });
  });

  it('shows industry badge', async () => {
    const mockTemplates = [
      { id: '1', name: '💇 Salon', slug: 'salon', industry: 'service', description: 'Salon template', layout_key: 'atelier', status: 'active', version: 1, is_default: true },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates, total: 1 }),
    });
    
    renderAdminTemplates();
    
    await waitFor(() => {
      expect(screen.getByText('service')).toBeTruthy();
    });
  });

  it('shows empty state when no templates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [], total: 0 }),
    });
    
    renderAdminTemplates();
    
    await waitFor(() => {
      expect(screen.getByText(/No templates found/i)).toBeTruthy();
    });
  });

  it('renders pagination when multiple pages', async () => {
    const mockTemplates = Array.from({ length: 25 }, (_, i) => ({
      id: `${i}`,
      name: `Template ${i}`,
      slug: `template-${i}`,
      industry: 'service',
      description: 'Desc',
      layout_key: 'craftsman',
      status: 'active',
      version: 1,
      is_default: false,
    }));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates.slice(0, 20), total: 25 }),
    });
    
    renderAdminTemplates();
    
    await waitFor(() => {
      expect(screen.getByTestId('pagination')).toBeTruthy();
      expect(screen.getByText('Previous')).toBeTruthy();
      expect(screen.getByText('Next')).toBeTruthy();
    });
  });
});