# 🚀 Small Business Template Platform - React Edition

A modern, full-featured SaaS platform for creating and managing small business websites.

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![Migration](https://img.shields.io/badge/Migration-100%25%20Complete-brightgreen)

---

## ✨ Features

### For Business Owners
- 🎨 **Template Selection** - Choose from professional, pre-designed templates
- ✏️ **Visual Editor** - Easy-to-use site editor with live preview
- 🖼️ **Image Upload** - Drag-and-drop image management
- 🎨 **Color Customization** - Brand your site with custom colors
- 📱 **Responsive Design** - Sites work perfectly on all devices
- 🚀 **One-Click Publishing** - Deploy your site instantly
- 📦 **Order Management** - Track customer orders
- 📊 **Analytics Dashboard** - Interactive charts and insights
- 💳 **Stripe Integration** - Accept payments seamlessly

### For Administrators
- 👥 **User Management** - Invite, edit, suspend, and manage users
- 📊 **Platform Analytics** - Monitor growth and performance
- 🔒 **Role-Based Access** - Secure admin-only features
- ⚡ **System Health** - Monitor server resources
- 📈 **Growth Metrics** - Track platform-wide trends

---

## 🛠️ Tech Stack

### Frontend
- **React** 19.2.0 - UI library
- **React Router** 7.9.5 - Client-side routing
- **Chart.js** 4.5.1 - Data visualization
- **Vite** 7.2.0 - Build tool and dev server

### Backend
- **Express** 5.1.0 - Web framework
- **PostgreSQL** (pg 8.16.3) - Database
- **JWT** - Authentication
- **Stripe** - Payment processing
- **Passport** - OAuth (Google, Apple)

### Development
- **Concurrently** - Run frontend + backend together
- **ESLint** - Code linting
- **Helmet** - Security headers
- **Compression** - Response compression

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/PersyLopez/Active-Directory.git
cd Active-Directory

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
psql -U postgres -f database/schema.sql

# Run migrations
npm run migrate
```

### Development

```bash
# Run frontend and backend together
npm run dev:all

# Or run separately:
npm run dev:backend  # Backend on port 3000
npm run dev          # Frontend on port 5173
```

### Production Build

```bash
# Build React app
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
├── src/                      # React frontend
│   ├── components/          # Reusable components
│   │   ├── layout/          # Header, Footer, etc.
│   │   ├── dashboard/       # Dashboard components
│   │   ├── setup/           # Editor components
│   │   ├── orders/          # Order components
│   │   ├── analytics/       # Analytics components
│   │   ├── admin/           # Admin components
│   │   └── auth/            # Auth components
│   ├── pages/               # Page components
│   │   ├── Landing.jsx      # Landing page
│   │   ├── Login.jsx        # Login page
│   │   ├── Register.jsx     # Registration
│   │   ├── Dashboard.jsx    # User dashboard
│   │   ├── Setup.jsx        # Site editor
│   │   ├── Orders.jsx       # Orders page
│   │   ├── Analytics.jsx    # Analytics page
│   │   ├── Admin.jsx        # Admin dashboard
│   │   ├── AdminUsers.jsx   # User management
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   └── NotFound.jsx     # 404 page
│   ├── context/             # React contexts
│   │   ├── AuthContext.jsx  # Authentication
│   │   ├── ToastContext.jsx # Notifications
│   │   └── SiteContext.jsx  # Site editor state
│   ├── hooks/               # Custom hooks
│   ├── styles/              # Global styles
│   └── main.jsx             # Entry point
├── public/                  # Static assets
│   ├── data/               # Template data
│   └── uploads/            # User uploads
├── server.js               # Express server
├── routes/                 # API routes
├── database/               # Database schema/migrations
├── validation/             # Template validation
└── package.json            # Dependencies
```

---

## 🎯 Key Pages

### User Pages
- `/` - Landing page with template showcase
- `/login` - User login
- `/register` - User registration
- `/dashboard` - User dashboard
- `/setup` - Site editor with live preview
- `/orders` - Order management
- `/analytics` - Analytics dashboard with charts
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form

### Admin Pages
- `/admin` - Platform admin dashboard
- `/admin/users` - User management

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login
POST   /api/auth/register  
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Sites & Templates
```
GET    /api/sites
GET    /api/sites/:id
POST   /api/sites
PUT    /api/sites/:id
DELETE /api/sites/:id
GET    /api/templates
POST   /api/uploads
```

### Drafts
```
GET    /api/drafts
POST   /api/drafts
PUT    /api/drafts/:id
POST   /api/drafts/:id/publish
```

### Orders
```
GET    /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id/status
```

### Analytics
```
GET    /api/analytics
GET    /api/analytics/sites
```

### Admin
```
GET    /api/admin/analytics
GET    /api/admin/users
POST   /api/admin/invite-user
PUT    /api/admin/users/:id
POST   /api/admin/users/:id/suspend
POST   /api/admin/users/:id/activate
DELETE /api/admin/users/:id
```

### Stripe
```
POST   /api/stripe/connect
GET    /api/stripe/dashboard
```

---

## 🎨 Component Library

### 40+ Reusable Components

**Layout**
- Header, Footer, ProtectedRoute, AdminRoute

**Dashboard**
- SiteCard, WelcomeModal, StripeConnectSection, TrialBanner

**Editor**
- TemplateGrid, EditorPanel, PreviewFrame, PublishModal
- BusinessInfoForm, ServicesEditor, ContactForm
- ImageUploader, ColorPicker

**Orders**
- OrderCard, OrderDetailsModal

**Analytics**
- StatsCard, SiteAnalyticsTable, AnalyticsChart

**Admin**
- UserDetailsModal

---

## 📊 Features in Detail

### Site Editor
- **Live Preview**: Real-time updates as you type
- **Template Library**: Professional, tier-based templates
- **Business Info**: Name, logo, hero section
- **Services**: Add/edit/delete services
- **Contact**: Email, phone, address, hours
- **Colors**: Custom brand colors
- **Images**: Drag-and-drop upload

### Analytics Dashboard
- **Key Metrics**: Views, visitors, duration, bounce rate
- **Interactive Charts**: 
  - Site views over time
  - Unique visitors
  - Orders over time
  - Revenue trends
- **Time Range Filter**: 7/30/90 days, all time
- **Site Performance**: Compare multiple sites

### Order Management
- **Order List**: All customer orders
- **Filtering**: By status (pending/completed/cancelled)
- **Search**: Find orders quickly
- **Details Modal**: Full order information
- **Status Updates**: Mark as completed/cancelled
- **CSV Export**: Download order data

### Admin Dashboard
- **Platform Overview**: Users, sites, revenue
- **Growth Metrics**: Daily/weekly/monthly trends
- **System Health**: CPU, memory, storage
- **Activity Feed**: Recent platform activity
- **User Management**: Full CRUD operations
- **Auto-Refresh**: Real-time updates

---

## 🔐 Authentication

### Supported Methods
- Email/Password
- Google OAuth
- Apple OAuth

### Features
- JWT-based authentication
- Password reset via email
- Session management
- Protected routes
- Role-based access control

---

## 🎨 Design System

### Colors
- **Primary**: Cyan (`#06b6d4`)
- **Secondary**: Teal (`#14b8a6`)
- **Background**: Dark (`#0a0f1a`)
- **Cards**: Elevated (`#1a2332`)
- **Text**: High contrast white/gray

### Typography
- **Headings**: Bold, large
- **Body**: Readable, 1.6 line-height
- **Code**: Monospace font

### Components
- **Cards**: Elevated with borders and shadows
- **Buttons**: Gradient backgrounds with hover effects
- **Inputs**: Dark theme with focus states
- **Modals**: Centered with backdrop
- **Toast**: Top-right notifications

---

## 📱 Responsive Design

### Breakpoints
- **Desktop**: > 1024px
- **Tablet**: 768-1024px
- **Mobile**: < 768px

### Mobile Features
- Touch-friendly buttons
- Stacked layouts
- Scrollable tables
- Collapsible sections
- Hamburger menu

---

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev                  # Frontend only
npm run dev:backend          # Backend only
npm run dev:all              # Frontend + Backend

# Production
npm run build                # Build React app
npm start                    # Start production server
npm run preview              # Preview production build

# Validation
npm run validate-template    # Validate single template
npm run validate-templates   # Validate all templates
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# JWT
JWT_SECRET=your-secret-key

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
APPLE_CLIENT_ID=your-apple-client-id

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (Resend)
RESEND_API_KEY=re_...

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

---

## 📚 Documentation

### Available Docs
- `README.md` - This file (overview)
- `README-REACT.md` - React setup and architecture
- `REACT-MIGRATION-FINAL.md` - Complete migration details
- `ADMIN-DASHBOARD-COMPLETE.md` - Admin dashboard docs
- `ADMIN-USERS-COMPLETE.md` - User management docs
- `ANALYTICS-PAGE-COMPLETE.md` - Analytics docs
- `ORDERS-PAGE-COMPLETE.md` - Orders docs
- `CORE-FUNCTIONALITY-COMPLETE.md` - Editor docs

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Heroku
```bash
heroku create your-app-name
git push heroku main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- React team for an amazing framework
- Chart.js for beautiful visualizations
- Stripe for seamless payments
- Vite for blazing-fast development

---

## 📞 Support

For support, email support@yourdomain.com or open an issue on GitHub.

---

## 🎉 Status

**Migration Status**: ✅ COMPLETE (100%)  
**Production Ready**: ✅ YES  
**Last Updated**: January 2025

All pages successfully migrated from HTML to React!

---

**Built with ❤️ using React, Express, and modern web technologies**
