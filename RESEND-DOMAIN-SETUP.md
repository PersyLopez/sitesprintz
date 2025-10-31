# Add Your Domain to Resend (5 minutes)

## Why Add Your Domain?
- ✅ Higher deliverability (Gmail trusts your domain)
- ✅ Professional sender address (noreply@yourdomain.com)
- ✅ No restrictions on recipients
- ✅ Better email reputation

## Steps:

### 1. Go to Resend Dashboard
https://resend.com/domains

### 2. Click "Add Domain"
Enter your domain (e.g., `yourdomain.com`)

### 3. Add DNS Records
Resend will show you 3 records to add:

**Example:**
```
Type: TXT
Name: _resend
Value: resend-verification-xxx
```

### 4. Add to Your DNS Provider
Where your domain is hosted:
- GoDaddy
- Namecheap  
- Cloudflare
- etc.

### 5. Verify Domain
Click "Verify" in Resend (may take a few minutes)

### 6. Update .env
```bash
FROM_EMAIL=noreply@yourdomain.com
```

### 7. Restart Server
```bash
npm start
```

Done! Emails will now come from your domain.

