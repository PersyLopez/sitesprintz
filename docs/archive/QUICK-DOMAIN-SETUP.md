# Quick Domain Setup for Resend (5 Minutes)

## ✅ Step-by-Step Guide

### Step 1: Add Your Domain to Resend

1. Go to: https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain name (e.g., `yourdomain.com` or `yourwebsite.com`)
4. Click **"Add"**

---

### Step 2: Copy the DNS Records

Resend will show you **3 DNS records** to add. They look like this:

```
Record 1 (SPF):
Type: TXT
Name: @ (or leave blank)
Value: v=spf1 include:_spf.resend.com ~all

Record 2 (DKIM):
Type: TXT  
Name: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBA... (long string)

Record 3 (DMARC):
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none
```

---

### Step 3: Add Records to Your DNS Provider

**Where is your domain registered?**
- GoDaddy → Go to DNS Management
- Namecheap → Go to Advanced DNS
- Cloudflare → Go to DNS
- Google Domains → Go to DNS
- Others → Look for "DNS Settings" or "DNS Management"

**How to add each record:**

1. Click **"Add Record"** or **"Add DNS Record"**
2. Select type: **TXT**
3. Enter the **Name** (from Resend)
4. Enter the **Value** (from Resend)
5. Save
6. Repeat for all 3 records

---

### Step 4: Verify in Resend

1. Go back to Resend dashboard
2. Click **"Verify Records"**
3. Wait ~30 seconds (can take up to 10 minutes if DNS is slow)
4. Should show ✅ **"Verified"**

---

### Step 5: Update Your .env File

```bash
# Change this line:
FROM_EMAIL=onboarding@resend.dev

# To this (use your domain):
FROM_EMAIL=noreply@yourdomain.com
# OR
FROM_EMAIL=hello@yourdomain.com
# OR
FROM_EMAIL=notifications@yourdomain.com
```

---

### Step 6: Restart Server

```bash
# Stop current server (Ctrl+C)
npm start
```

---

### Step 7: Test It!

Publish a new site or register a new user - you should get emails now!

---

## 🎉 Done!

Emails will now be delivered from **your domain** with:
- ✅ High deliverability
- ✅ Professional appearance  
- ✅ No restrictions
- ✅ Your branding

---

## ⏱️ DNS Propagation Time

- **Usually**: 1-5 minutes
- **Sometimes**: Up to 1 hour
- **Rarely**: Up to 24 hours

If verification fails, wait 5 minutes and try again.

