import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
    // Frontend project (React / Happy-DOM)
    {
        test: {
            name: 'frontend',
            include: [
                'src/**/*.test.{js,jsx,ts,tsx}',
                'tests/unit/components/**/*.test.{js,jsx}'
            ],
            environment: 'jsdom', // Happy-DOM is often faster, but using JSDOM as it was already here
            setupFiles: ['./tests/setup.js'],
            globals: true,
            alias: {
                '@': './src',
                '@server': './server',
                '@database': './database'
            }
        },
        plugins: [
            // Add any specific frontend plugins here if needed
        ]
    },
    // Backend project (Node.js)
    {
        test: {
            name: 'backend',
            include: [
                'server/**/*.test.js',
                'tests/unit/utils/**/*.test.js',
                'tests/unit/middleware/**/*.test.js',
                'tests/integration/**/*.test.js'
            ],
            environment: 'node',
            globals: true,
            alias: {
                '@': './src',
                '@server': './server',
                '@database': './database'
            }
        }
    }
]);
