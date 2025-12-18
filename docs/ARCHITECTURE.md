# 🏗️ SiteSprintz Architecture Documentation

**Last Updated:** December 2025  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Project Structure](#project-structure)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)

---

## 🎯 System Overview

SiteSprintz is a **Small Business Website Builder** platform that enables users to create, customize, and publish professional websites in minutes. The platform provides:

- **12+ Industry Templates** with multiple layout variations
- **Visual Editor** for drag-and-drop customization
- **Stripe Integration** for payments and subscriptions
- **Booking System** for appointments and reservations
- **Email Notifications** via Resend
- **Public Showcase** gallery
- **Analytics Dashboard**

### Core Principles

- **Monolithic Architecture**: Single Express.js server with React frontend
- **Database-First**: PostgreSQL with Prisma ORM
- **API-Driven**: RESTful API endpoints
- **Security-First**: JWT authentication, CSRF protection, rate limiting
- **Scalable**: Designed for horizontal scaling

---

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma 6.x
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Image Processing**: Sharp

### Frontend
- **Framework**: React 19.x
- **Build Tool**: Vite 7.x
- **Routing**: React Router DOM 7.x
- **Styling**: TailwindCSS + Custom CSS
- **State Management**: React Context API
- **Charts**: Chart.js + react-chartjs-2

### Integrations
- **Payments**: Stripe Connect
- **Email**: Resend (primary), Nodemailer (fallback)
- **CAPTCHA**: Cloudflare Turnstile
- **OAuth**: Passport.js (Google, Apple)

### DevOps & Testing
- **Testing**: Vitest (unit), Playwright (E2E)
- **Deployment**: Railway.app, Docker
- **CI/CD**: Git-based workflow (dev → staging → main)
- **Monitoring**: Winston logging

---

## 🏛 Architecture Patterns

### 1. **Layered Architecture**

```
┌─────────────────────────────────────┐
│         Presentation Layer           │
│    (React Components & Pages)       │
├─────────────────────────────────────┤
│         Application Layer            │
│    (Routes, Controllers)             │
├─────────────────────────────────────┤
│         Business Logic Layer         │
│    (Services, Utilities)             │
├─────────────────────────────────────┤
│         Data Access Layer            │
│    (Prisma ORM, Database)            │
└─────────────────────────────────────┘
```

### 2. **RESTful API Design**

- **Resource-Based URLs**: `/api/sites/:id`, `/api/users/:id`
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Status Codes**: 200 (success), 201 (created), 400 (bad request), 401 (unauthorized), 404 (not found), 500 (error)
- **JSON Responses**: Consistent error format `{ error: string }`

### 3. **Middleware Chain**

```
Request → Security (Helmet, CORS) 
       → Rate Limiting 
       → CSRF Protection 
       → Authentication 
       → Authorization 
       → Route Handler 
       → Error Handler 
       → Response
```

### 4. **Context-Based State Management**

- **AuthContext**: User authentication state
- **SiteContext**: Current site editing state
- **CartContext**: Shopping cart state
- **ToastContext**: Notification messages

---

## 📁 Project Structure

```
sitesprintz/
├── server/                    # Backend code
│   ├── routes/               # API route handlers (23 files)
│   ├── services/             # Business logic services (15 files)
│   ├── middleware/           # Express middleware (7 files)
│   └── utils/                # Helper utilities (12 files)
│
├── src/                      # Frontend code
│   ├── components/           # React components (organized by feature)
│   ├── pages/                # Page components (20 files)
│   ├── context/              # React Context providers (4 files)
│   ├── hooks/                # Custom React hooks (6 files)
│   ├── services/             # API client services (5 files)
│   └── utils/                # Frontend utilities (5 files)
│
├── database/                 # Database configuration
│   └── db.js                 # Prisma client initialization
│
├── prisma/                   # Prisma schema & migrations
│   └── schema.prisma         # Database schema definition
│
├── public/                   # Static assets
│   ├── data/templates/       # Template JSON files
│   ├── sites/                # Published site files
│   └── uploads/              # User-uploaded images
│
├── tests/                    # Test suites
│   ├── unit/                 # Unit tests
│   └── e2e/                  # End-to-end tests
│
└── docs/                     # Documentation
    ├── setup/                # Setup guides
    ├── security/             # Security documentation
    └── guides/               # User guides
```

---

## 🔄 Data Flow

### Authentication Flow

```
1. User submits credentials → POST /api/auth/login
2. Server validates → Checks database, verifies password
3. Server generates JWT → Returns token + user data
4. Client stores token → localStorage/sessionStorage
5. Client includes token → Authorization: Bearer <token>
6. Middleware validates → requireAuth middleware checks token
7. Request proceeds → User attached to req.user
```

### Site Creation Flow

```
1. User selects template → GET /api/templates
2. User customizes site → POST /api/drafts/:id (save draft)
3. User publishes site → POST /api/drafts/:id/publish
4. Server generates files → Creates JSON + HTML files
5. Server saves to DB → Updates sites table
6. Site is live → Available at /sites/:subdomain
```

### Payment Flow

```
1. User selects plan → Frontend shows pricing
2. User clicks subscribe → POST /api/create-subscription-checkout
3. Server creates Stripe session → Returns checkout URL
4. User completes payment → Stripe redirects to success page
5. Stripe sends webhook → POST /api/webhooks/stripe
6. Server processes webhook → Updates user subscription
7. User access granted → Pro features unlocked
```

---

## 🔐 Security Architecture

### Authentication

- **JWT Tokens**: 7-day expiration, stored client-side
- **Password Hashing**: bcryptjs with 10 rounds
- **Email Verification**: Required for account activation
- **Password Reset**: Token-based with expiration

### Authorization

- **Role-Based Access Control (RBAC)**: `user`, `admin`
- **Resource Ownership**: Users can only access their own resources
- **Admin Routes**: Protected by `requireAdmin` middleware

### Protection Layers

1. **Helmet.js**: Security headers (CSP, HSTS, XSS protection)
2. **CORS**: Configured for production domains
3. **CSRF Protection**: Token-based for state-changing operations
4. **Rate Limiting**: Per-endpoint limits (registration, login, API)
5. **Input Validation**: Sanitization and validation on all inputs
6. **SQL Injection**: Prevented by Prisma parameterized queries
7. **XSS Protection**: HTML sanitization with sanitize-html
8. **CAPTCHA**: Cloudflare Turnstile for registration/login

### Security Headers

```
Content-Security-Policy: Strict directives
Strict-Transport-Security: 1 year, includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 🚀 Deployment Architecture

### Production Environment

```
┌─────────────────┐
│   Railway.app    │
│   (Container)    │
├─────────────────┤
│  Express Server  │
│  Port: 3000      │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│  Neon │ │Stripe │
│  DB   │ │ API   │
└───────┘ └───────┘
```

### Build Process

1. **Frontend Build**: `vite build` → `dist/` directory
2. **Static Assets**: Served by Express from `dist/`
3. **API Routes**: Handled by Express server
4. **SPA Routing**: Fallback to `index.html` for non-API routes

### Environment Variables

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `ADMIN_TOKEN`: Admin authentication token

**Optional:**
- `STRIPE_SECRET_KEY`: Stripe API key
- `RESEND_API_KEY`: Email service API key
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth secret

---

## 📊 Database Architecture

### Core Models

- **users**: User accounts, authentication, subscriptions
- **sites**: Website instances, templates, status
- **booking_tenants**: Booking system configuration
- **appointments**: Booking appointments
- **submissions**: Contact form submissions
- **pricing**: Subscription tier definitions

### Relationships

```
users (1) ──→ (many) sites
sites (1) ──→ (1) booking_tenants
booking_tenants (1) ──→ (many) appointments
sites (1) ──→ (many) submissions
```

### Indexing Strategy

- **Primary Keys**: UUID for users, appointments
- **Foreign Keys**: Indexed for join performance
- **Search Fields**: Email, subdomain, confirmation_code
- **Time-based**: Created_at, updated_at for queries

---

## 🔌 API Architecture

### Endpoint Organization

- **Authentication**: `/api/auth/*`
- **Sites**: `/api/sites/*`, `/api/drafts/*`
- **Payments**: `/api/payments/*`, `/api/webhooks/stripe`
- **Booking**: `/api/booking/*`
- **Admin**: `/api/admin/*`
- **Showcase**: `/api/showcases/*`

### Request/Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

---

## 📈 Scalability Considerations

### Current Limitations

- **Single Server**: Monolithic deployment
- **File Storage**: Local filesystem (not suitable for multi-instance)
- **Session Storage**: In-memory (not shared across instances)

### Future Scaling Options

1. **Horizontal Scaling**: Load balancer + multiple instances
2. **File Storage**: S3 or similar object storage
3. **Session Storage**: Redis for shared sessions
4. **Database**: Read replicas for analytics queries
5. **Caching**: Redis for template data, user sessions

---

## 🔍 Monitoring & Logging

### Logging Strategy

- **Winston**: Structured logging
- **Request Logging**: All API requests logged with timing
- **Error Logging**: Stack traces for errors
- **Security Events**: Failed auth attempts, rate limit hits

### Health Checks

- **Endpoint**: `GET /health`
- **Database**: Connection test on startup
- **External Services**: Stripe, Resend connectivity

---

## 📚 Related Documentation

- [API Reference](./API-REFERENCE.md)
- [Backend Documentation](./BACKEND.md)
- [Frontend Documentation](./FRONTEND.md)
- [Database Schema](./DATABASE.md)
- [Security Guide](./security/SECURITY-ASSESSMENT.md)

---

**Last Updated:** December 2025  
**Maintained by:** SiteSprintz Development Team





