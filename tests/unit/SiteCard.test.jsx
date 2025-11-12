import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SiteCard from '@/components/dashboard/SiteCard';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('SiteCard', () => {
  const mockSite = {
    id: 'site-1',
    businessName: 'Test Business',
    subdomain: 'testbusiness',
    template: 'restaurant-casual',
    status: 'published',
    createdAt: '2024-01-01T00:00:00Z',
    publishedAt: '2024-01-02T00:00:00Z',
    plan: 'starter'
  };

  const mockDeleteHandler = vi.fn();
  const mockDuplicateHandler = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'fake-token'),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    });
  });

  it('should render site information correctly', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
        onDuplicate={mockDuplicateHandler}
      />
    );

    expect(screen.getByText('Test Business')).toBeInTheDocument();
    expect(screen.getByText('restaurant-casual')).toBeInTheDocument();
    expect(screen.getByText('✅ Published')).toBeInTheDocument();
  });

  it('should show published status for published sites', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
      />
    );

    expect(screen.getByText('✅ Published')).toBeInTheDocument();
  });

  it('should show draft status for draft sites', () => {
    const draftSite = { ...mockSite, status: 'draft' };
    
    renderWithRouter(
      <SiteCard 
        site={draftSite} 
        onDelete={mockDeleteHandler}
      />
    );

    expect(screen.getByText('📝 Draft')).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
      />
    );

    const deleteButton = screen.getByTitle('Delete site');
    fireEvent.click(deleteButton);

    expect(mockDeleteHandler).toHaveBeenCalledTimes(1);
  });

  it('should call onDuplicate when duplicate button is clicked', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
        onDuplicate={mockDuplicateHandler}
      />
    );

    const duplicateButton = screen.getByTitle('Duplicate site');
    fireEvent.click(duplicateButton);

    expect(mockDuplicateHandler).toHaveBeenCalledTimes(1);
  });

  it('should not render duplicate button if onDuplicate is not provided', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
      />
    );

    expect(screen.queryByTitle('Duplicate site')).not.toBeInTheDocument();
  });

  it('should render view button for published sites', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
      />
    );

    const viewButton = screen.getByTitle('View live site');
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveAttribute('href', expect.stringContaining('/sites/testbusiness/'));
  });

  it('should disable preview button for draft sites', () => {
    const draftSite = { ...mockSite, status: 'draft' };
    
    renderWithRouter(
      <SiteCard 
        site={draftSite} 
        onDelete={mockDeleteHandler}
      />
    );

    const previewButton = screen.getByTitle('Preview draft');
    expect(previewButton).toBeDisabled();
  });

  it('should show orders button for pro sites', () => {
    const proSite = { ...mockSite, plan: 'pro' };
    
    renderWithRouter(
      <SiteCard 
        site={proSite} 
        onDelete={mockDeleteHandler}
      />
    );

    expect(screen.getByText(/View Orders/)).toBeInTheDocument();
  });

  it('should not show orders button for starter sites', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
      />
    );

    expect(screen.queryByText(/View Orders/)).not.toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
      />
    );

    // The date should be formatted as "Jan 2, 2024" or similar
    expect(screen.getByText(/Published:.*Jan/i)).toBeInTheDocument();
  });

  it('should display fallback text for untitled sites', () => {
    const untitledSite = { ...mockSite, businessName: '', name: '' };
    
    renderWithRouter(
      <SiteCard 
        site={untitledSite} 
        onDelete={mockDeleteHandler}
      />
    );

    expect(screen.getByText('Untitled Site')).toBeInTheDocument();
  });

  it('should display plan badge', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
      />
    );

    expect(screen.getByText(/Plan:/)).toBeInTheDocument();
    expect(screen.getByText('starter')).toBeInTheDocument();
  });

  it('should render hero image when available', () => {
    const siteWithImage = { 
      ...mockSite, 
      heroImage: 'https://example.com/image.jpg' 
    };
    
    renderWithRouter(
      <SiteCard 
        site={siteWithImage} 
        onDelete={mockDeleteHandler}
      />
    );

    const image = screen.getByAltText('Test Business');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should show placeholder when no hero image', () => {
    renderWithRouter(
      <SiteCard 
        site={mockSite} 
        onDelete={mockDeleteHandler}
      />
    );

    // Check for placeholder div rather than emoji text (appears multiple times)
    const placeholder = document.querySelector('.thumbnail-placeholder');
    expect(placeholder).toBeInTheDocument();
  });
});

