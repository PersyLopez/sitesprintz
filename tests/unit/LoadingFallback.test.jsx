import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingFallback from '../../src/components/common/LoadingFallback';

describe('LoadingFallback', () => {
  it('renders the message and a table skeleton instead of a lone spinner', () => {
    render(<LoadingFallback message="Loading orders..." />);

    expect(screen.getByText('Loading orders...')).toBeInTheDocument();

    const skeletons = document.querySelectorAll('.skeleton-loader.skeleton-table');
    expect(skeletons.length).toBe(1);
    expect(skeletons[0].querySelectorAll('.skeleton-table-row').length).toBe(4);
  });

  it('keeps the message available to assistive tech on the status region', () => {
    render(<LoadingFallback message="Loading products..." />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading products...');
  });

  it('renders title and message when both are provided', () => {
    render(<LoadingFallback title="Dashboard" message="Loading dashboard..." />);

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });
});
