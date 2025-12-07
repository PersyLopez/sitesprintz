# 🔐 Admin Setup Guide

Complete guide for creating and managing admin users in SiteSprintz.

---

## 🚀 Quick Start

### Create Admin Account

```bash
npm run create-admin
```

**You'll be prompted for:**
1. Admin email address
2. Password (minimum 8 characters)

**Example:**
```bash
$ npm run create-admin

📧 Enter admin email: persy@example.com
Enter password: ********

✅ Admin user created successfully!
   Email:  persy@example.com
   Role:   admin

🔗 Login at: http://localhost:5173/login
```

---

## 🔧 What the Script Does

**For New Users:**
- Validates email format
- Hashes password with bcrypt (10 rounds)
- Creates user with role: `admin`, status: `active`

**For Existing Users:**
- Detects existing account
- Offers to upgrade to admin
- Optionally updates password

---

## 🔒 Security Best Practices

### Password Requirements

- ✅ Minimum 8 characters (enforced)
- ✅ Use strong, unique passwords
- ✅ Use a password manager
- ✅ Don't reuse passwords

**Password Strength Examples:**
```
❌ Weak:   password123
⚠️  Medium: MyPassword123!
✅ Strong:  7k$mP9@xLq2#vN8r
```

### Production Security

1. Never commit credentials to git
2. Use environment variables for sensitive data
3. Rotate passwords regularly
4. Use different passwords for dev/staging/production

---

## 🎭 Admin vs Regular User

### Admin Users Can:
- ✅ Access `/admin` dashboard
- ✅ View all users
- ✅ Manage user accounts
- ✅ View system analytics
- ✅ Access admin-only API endpoints

### Regular Users Can:
- ✅ Access `/dashboard`
- ✅ Create and manage their own sites
- ✅ Publish sites
- ❌ Cannot access admin features

---

## 🧪 Testing Your Admin Account

### 1. Login Test (Browser)
1. Navigate to: http://localhost:5173/login
2. Enter your admin credentials
3. ✅ You should be redirected to `/admin` (not `/dashboard`)

### 2. API Test
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"YourPass"}' \
  | jq -r '.token')

# Test admin endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/users | jq .
```

✅ If you can access `/api/admin/users`, your admin account works!

---

## 🐛 Troubleshooting

### "User already exists"
**Solution:** Update the existing user:
```bash
npm run create-admin
# Enter existing email
# Answer "yes" to update to admin
```

### "Invalid credentials" when logging in
**Solution:** Reset password:
```bash
npm run create-admin your-email@example.com
# Enter new password
```

### Redirects to `/dashboard` instead of `/admin`
**Solution:** Verify role and re-login:
```bash
# Update role
npm run create-admin your-email@example.com

# Clear browser cache and login again
```

---

## 📝 Production Checklist

Before deploying to production:

- [ ] Create admin account using production database
- [ ] Use a strong, unique password
- [ ] Store credentials securely (password manager)
- [ ] Test admin login on production
- [ ] Verify admin dashboard access
- [ ] Delete/disable any test admin accounts
- [ ] Document admin email for your team

---

## 💡 FAQs

**Q: Can I have multiple admin users?**  
A: Yes! Run `npm run create-admin` multiple times with different emails.

**Q: Can I change my admin password?**  
A: Yes, run `npm run create-admin` with your email and enter a new password.

**Q: What happens if I forget my admin password?**  
A: Run `npm run create-admin` with your email to reset it.

**Q: Is the password stored securely?**  
A: Yes, passwords are hashed using bcrypt with 10 rounds. Plain text is never stored.

**Q: Can I demote an admin back to regular user?**  
A: Yes, update the database:
```sql
UPDATE users SET role = 'user' WHERE email = 'email@example.com';
```

---

**Created:** November 16, 2025  
**Last Updated:** November 20, 2025
