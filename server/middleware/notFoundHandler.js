import { sendNotFound } from '../utils/apiResponse.js';

/**
 * Not Found Handler Middleware
 * 
 * Handles 404 responses for both API and HTML requests.
 * Must be placed after all route handlers but before errorHandler.
 */
export function notFoundHandler(req, res, next) {
    // API routes return JSON
    if (req.path.startsWith('/api/')) {
        return sendNotFound(res, 'Endpoint');
    }

    // HTML routes return a simple 404 page
    res.status(404).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            text-align: center;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            max-width: 500px;
        }
        h1 {
            font-size: 4rem;
            margin: 0 0 0.5rem 0;
            color: #667eea;
        }
        p {
            color: #666;
            font-size: 1.1rem;
            margin: 0;
        }
        a {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.75rem 1.5rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background 0.2s;
        }
        a:hover {
            background: #764ba2;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">Go Home</a>
    </div>
</body>
</html>
    `);
}
