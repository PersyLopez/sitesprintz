import React, { useOptimistic, useTransition } from 'react';

export function OptimisticTask({ onAddTask }) {
    const [optimisticTasks, addOptimisticTask] = useOptimistic(
        [],
        (state, newTask) => [...state, { ...newTask, pending: true }]
    );
    const [isPending, startTransition] = useTransition();

    const handleAction = async (formData) => {
        const taskName = formData.get('task');
        const newTask = { name: taskName };

        startTransition(async () => {
            addOptimisticTask(newTask);
            await onAddTask(newTask);
        });
    };

    return (
        <div>
            <form action={handleAction}>
                <input name="task" placeholder="Add task" />
                <button type="submit">Add</button>
            </form>
            <ul>
                {optimisticTasks.map((task, i) => (
                    <li key={i}>
                        {task.name} {task.pending && '(Adding...)'}
                    </li>
                ))}
            </ul>
        </div>
    );
}
