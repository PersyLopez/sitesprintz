# SiteSprintz - Small Business Website Builder

A modern, full-stack web application that empowers small businesses to create professional websites using pre-built templates with customizable content and integrated payment processing.

## 🚀 Features

- **13+ Professional Templates** - Categorized by plan tier (Starter, Checkout, Premium)
  - Restaurant, Salon, Gym, Freelancer, Consultant, Tech Repair, Cleaning, Pet Care, E-commerce
- **User Authentication** - Secure JWT-based auth with bcrypt password hashing
- **Draft System** - Customize sites without payment, publish when ready
- **Payment Integration** - Stripe checkout (ready for configuration)
- **Image Upload** - Direct upload to server with automatic file management
- **Live Preview** - Real-time preview during customization
- **Subdomain Hosting** - Each published site gets a unique subdomain
- **Mobile Responsive** - All templates are mobile-optimized

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn
- Stripe account (optional, for payments)

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/PersyLopez/Active-Directory.git
   cd active-directory-website
   git checkout small-biz-template
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your values (secure tokens already generated if you have a .env file)
   ```

4. **Start the server:**
   ```bash
   npm start
   # Or for development:
   npm run dev
   ```

5. **Access the application:**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### Environment Variables

Edit `.env` file with the following:

```bash
PORT=3000
ADMIN_TOKEN=your_admin_token_here    # Generated securely
JWT_SECRET=your_jwt_secret_here      # Generated securely

# Stripe (optional - add your test keys from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Allowed origins for checkout (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000
```

### Stripe Setup (Optional)

1. Create a Stripe account at https://stripe.com
2. Get your test API keys from https://dashboard.stripe.com/test/apikeys
3. Add keys to `.env`
4. Update setup.html line 2146 with your publishable key
5. Set up webhook endpoint at `/api/webhooks/stripe`

## 📁 Project Structure

```
├── server.js              # Express server + all API endpoints
├── package.json           # Dependencies and scripts
├── .env                   # Environment configuration (gitignored)
├── public/
│   ├── index.html         # Landing page
│   ├── setup.html         # Site builder with live preview
│   ├── dashboard.html     # User dashboard (manage sites)
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── app.js             # Frontend renderer for published sites
│   ├── styles.css         # Global styles
│   ├── data/
│   │   ├── site.json      # Default site configuration
│   │   └── templates/     # Template JSON files (13 templates)
│   ├── sites/             # Published sites (subdomain-based)
│   ├── drafts/            # Unpublished drafts (7-day expiration)
│   ├── users/             # User data (JSON file storage)
│   └── uploads/           # Uploaded images
└── var/
    └── stripe-events/     # Webhook event logs
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout (client-side JWT removal)
- `POST /api/auth/forgot-password` - Request password reset

### Drafts & Publishing
- `POST /api/drafts` - Save site as draft
- `GET /api/drafts/:id` - Get draft by ID
- `DELETE /api/drafts/:id` - Delete draft
- `POST /api/drafts/:id/publish` - Publish draft to live site

### User Management
- `GET /api/users/:userId/sites` - Get user's sites
- `DELETE /api/users/:userId/sites/:siteId` - Delete site

### Media
- `POST /api/upload` - Upload image (requires admin token)
- `DELETE /api/uploads/:filename` - Delete uploaded image
- `GET /api/admin-token` - Get admin token for uploads

### Payments (Stripe)
- `GET /api/payments/config` - Get payment configuration
- `POST /api/payments/checkout-sessions` - Create Stripe checkout
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

## 🎨 Template Tiers

### Starter (Display Only)
- Basic one-page sites with pricing display
- Offline CTAs (call, email, visit)
- No payment processing

### Checkout (Payment Enabled)
- Everything in Starter
- Stripe checkout integration
- Order management dashboard

### Premium (Coming Soon)
- Multi-page layouts
- Blog functionality
- Scheduling integrations
- CRM automation

## 🚦 Development Workflow

1. **Local Development:**
   ```bash
   npm run dev
   ```

2. **Make changes to:**
   - Backend: `server.js`
   - Frontend: `public/*.html`, `public/app.js`
   - Templates: `public/data/templates/*.json`

3. **Test the flow:**
   - Register user → Login → Create draft → Publish site

## 🧪 Testing

Currently manual testing. Test checklist:

- [ ] User registration and login
- [ ] Draft creation and saving
- [ ] Image upload functionality
- [ ] Live preview during customization
- [ ] Publishing flow (with/without payment)
- [ ] Published site accessibility
- [ ] Subdomain routing

## 🐛 Known Issues & TODOs

- [ ] Email sending not implemented (password reset, confirmations)
- [ ] Site editing after publish needs implementation
- [ ] Custom domain support planned but not implemented
- [ ] Image optimization needed
- [ ] Rate limiting should be added
- [ ] Stripe payment flow needs final integration when keys are added

## 🔐 Security Notes

- JWT tokens expire after 7 days
- Passwords hashed with bcrypt (10 rounds)
- Admin token required for uploads
- Server-side validation on all inputs
- User files stored with sanitized filenames

## 📝 Branch Information

**Current Branch:** `small-biz-template`

This branch contains the complete small business website builder application.

## 📄 License

ISC

## 👥 Contributing

This is a personal project. For issues or suggestions, please contact the repository owner.

## 📞 Support

For questions or issues:
- Check documentation files in the repo
- Review DEVELOPMENT-TASKS.md for implementation details
- Create an issue on GitHub
