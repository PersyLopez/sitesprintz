# 🔐 Unified Authentication Flows

All authentication entry points now provide **consistent sign-in options** for the best user experience.

---

## ✅ Unified Sign-In Options

Every authentication flow offers:

1. **Google OAuth** - One-click sign-in with Google account
2. **Email + Password** - Traditional registration/login
3. **Magic Link** - Passwordless email authentication (where applicable)

---

## 🎯 Authentication Entry Points

### 1. Traditional Registration (`/register.html`)
```
┌─────────────────────────────────┐
│   Create Your Account           │
├─────────────────────────────────┤
│  [Continue with Google]         │
│                                  │
│  ─── or continue with email ─── │
│                                  │
│  Email: ___________________     │
│  Password: ________________     │
│  Confirm: _________________     │
│                                  │
│  [Create Account]               │
│                                  │
│  Already have account? Sign in  │
└─────────────────────────────────┘
```

**Features:**
- ✅ Google OAuth
- ✅ Email + Password
- ✅ Password strength validation
- ✅ Email verification

---

### 2. Login (`/login.html`)
```
┌─────────────────────────────────┐
│   Welcome Back!                 │
├─────────────────────────────────┤
│  [Continue with Google]         │
│                                  │
│  ─── or sign in with email ───  │
│                                  │
│  Email: ___________________     │
│  Password: ________________     │
│                                  │
│  [Sign In]                      │
│                                  │
│  Don't have account? Create one │
│  Forgot your password?          │
└─────────────────────────────────┘
```

**Features:**
- ✅ Google OAuth
- ✅ Email + Password
- ✅ Password recovery link
- ✅ Remember me option

---

### 3. Quick Publish Flow (`/quick-publish.html`)
```
┌─────────────────────────────────┐
│   🚀 Publish Your Site          │
├─────────────────────────────────┤
│  Your Site: businessname.site   │
│                                  │
│  [Continue with Google]         │
│                                  │
│  ─── or continue with email ─── │
│                                  │
│  Email: ___________________     │
│                                  │
│  [Publish Now]                  │
│                                  │
│  ✨ Instant publish              │
│  🎁 7-day free trial            │
│  📧 Verify email anytime        │
│                                  │
│  Already have account? Sign in  │
└─────────────────────────────────┘
```

**Features:**
- ✅ Google OAuth with auto-publish
- ✅ Email-only quick registration
- ✅ Deferred password setup
- ✅ Auto-creates account + publishes site

---

## 🔄 OAuth Flow with Publish Intent

### Step 1: User Clicks "Continue with Google" on Quick Publish
```javascript
// Saves site data before redirect
sessionStorage.setItem('pendingPublish', siteData);
window.location.href = '/auth/google?intent=publish';
```

### Step 2: Google OAuth Callback
```javascript
// Server detects publish intent
if (user.pendingIntent === 'publish') {
  res.redirect(`/auto-publish.html?token=${token}`);
}
```

### Step 3: Auto-Publish Page (`/auto-publish.html`)
```javascript
// Retrieves saved site data
const siteData = sessionStorage.getItem('pendingPublish');

// Publishes automatically
await fetch('/api/sites/guest-publish', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ data: siteData })
});

// Redirects to success
window.location.href = '/publish-success.html';
```

---

## 📋 Backend Support

### Server Endpoints

#### 1. `/api/auth/quick-register`
- Email-only registration
- Creates user with temporary password
- Status: 'pending' until email verified
- Sends magic link for password setup

#### 2. `/api/sites/guest-publish`
- Accepts authenticated or email-only requests
- Creates user if doesn't exist
- Publishes site immediately
- Returns subdomain + URL

#### 3. `/auth/google`
- Supports `?intent=publish` parameter
- Preserves site data during OAuth flow
- Routes to appropriate success page

#### 4. `/auth/google/callback`
- Checks for `pendingIntent`
- Redirects to `/auto-publish.html` if intent=publish
- Otherwise redirects to dashboard

---

## 🎨 UI Consistency

All auth pages share:

### Design Elements
- ✅ Same Google OAuth button style
- ✅ Same divider design ("or continue with email")
- ✅ Consistent form styling
- ✅ Matching button styles
- ✅ Unified error messaging

### CSS Classes
```css
.social-auth-btn      /* Google OAuth button */
.divider              /* "or continue with" separator */
.form-input           /* Email/password inputs */
.btn-primary          /* Submit buttons */
```

---

## 🚀 User Journeys

### Journey A: Guest → Google OAuth → Published Site
1. Build site without account ✅
2. Click "Publish" → quick-publish.html ✅
3. Click "Continue with Google" ✅
4. OAuth authentication ✅
5. Auto-redirect to auto-publish.html ✅
6. Site published automatically ✅
7. Redirect to success page ✅

**Time: ~30 seconds**

---

### Journey B: Guest → Email → Published Site
1. Build site without account ✅
2. Click "Publish" → quick-publish.html ✅
3. Enter email only ✅
4. Site published immediately ✅
5. Receive magic link to set password ✅
6. Access dashboard anytime ✅

**Time: ~45 seconds**

---

### Journey C: Traditional Registration
1. Visit /register.html ✅
2. Choose Google OAuth or Email+Password ✅
3. Complete registration ✅
4. Redirect to dashboard ✅
5. Start building ✅

**Time: ~1-2 minutes**

---

## 🔒 Security Features

All flows include:
- ✅ JWT token authentication
- ✅ Bcrypt password hashing
- ✅ Email verification
- ✅ Magic link authentication
- ✅ OAuth state validation
- ✅ CSRF protection

---

## 📱 Mobile Optimization

All auth pages are:
- ✅ Fully responsive
- ✅ Touch-friendly buttons
- ✅ Optimized form inputs
- ✅ Smooth animations
- ✅ Fast loading

---

## ✨ Benefits of Unified Auth

### For Users:
- 🎯 **Consistent Experience** - Same options everywhere
- ⚡ **Fast** - Choose quickest method for you
- 🔒 **Secure** - Multiple trusted auth methods
- 📱 **Flexible** - Works on all devices

### For Business:
- 📈 **Higher Conversion** - More auth options = more signups
- 🎨 **Professional** - Consistent branding
- 🛠️ **Maintainable** - Reusable components
- 📊 **Trackable** - Clear user paths

---

## 🧪 Testing

Test all flows:

```bash
# 1. Test Google OAuth on register
Visit: http://localhost:3000/register.html
Click: "Continue with Google"
✅ Should redirect to dashboard

# 2. Test Google OAuth on quick-publish
Build guest site → Click Publish
Click: "Continue with Google"
✅ Should publish site automatically

# 3. Test email registration
Visit: http://localhost:3000/register.html
Enter: email + password
✅ Should create account

# 4. Test email quick-publish
Build guest site → Click Publish
Enter: email only
✅ Should publish immediately

# 5. Test login with Google
Visit: http://localhost:3000/login.html
Click: "Continue with Google"
✅ Should login successfully
```

---

## 📝 Next Steps

To maintain consistency:

1. **New Auth Entry Point?** → Add same buttons
2. **Update Google Button?** → Update all pages
3. **New Social Auth?** → Add to all flows
4. **Change Styles?** → Update shared CSS

---

## 🎉 Result

**Every user gets the same premium authentication experience, regardless of which entry point they use!**

- ✅ Guest builder flow
- ✅ Traditional registration
- ✅ Login page
- ✅ Quick publish
- ✅ OAuth callbacks

All flows = Same options = Better UX! 🚀

