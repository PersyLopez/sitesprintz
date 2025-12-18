import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { OptimisticTask } from '../../../src/components/OptimisticTask';

describe('OptimisticTask (Rule 3)', () => {
    it('should show optimistic update then confirm', async () => {
        const user = userEvent.setup();

        // Controlled promise for network resolution
        let resolveTask;
        const taskPromise = new Promise(resolve => {
            resolveTask = resolve;
        });

        const mockOnAddTask = vi.fn().mockReturnValue(taskPromise);

        // Use the global renderWithStrictMode from setup.js
        global.renderWithStrictMode(<OptimisticTask onAddTask={mockOnAddTask} />);

        const input = screen.getByPlaceholderText('Add task');
        const button = screen.getByRole('button', { name: 'Add' });

        await user.type(input, 'New Task');
        await user.click(button);

        // Phase 2: Optimistic State (before network resolves)
        // We expect to see the task with "(Adding...)" suffix immediately
        expect(screen.getByText('New Task (Adding...)')).toBeInTheDocument();

        // Phase 3: Settled State (after network resolves)
        resolveTask();

        await waitFor(() => {
            expect(screen.queryByText('New Task (Adding...)')).not.toBeInTheDocument();
            expect(screen.getByText('New Task')).toBeInTheDocument();
        });
    });
});
