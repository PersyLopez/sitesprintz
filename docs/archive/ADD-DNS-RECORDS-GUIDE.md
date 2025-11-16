# 📧 Add Resend DNS Records to Your Domain

**Configure your domain to send emails via Resend**

---

## 🎯 What You Need to Add

You have 3 DNS records to add to your domain provider:

### **1. DKIM Record (Domain Verification)**
```
Type: TXT
Name: resend._domainkey
Content: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDMKEyVNVYuEGXhaYfRwwxCMrZvqCpa0ix1QwvRLaBrO4EHsx0wk10MofUyWdF7EpHSuG9wzfyJ+R1Py68oZ3d4Z7GaivFL2P6vHlP0u/Z/mHyz22UsHQot5jKJ1qx+TshwRL5byyk4rwEV49b1RQ/Ew0I41G3SkBtn295QY55jhQIDAQAB
TTL: Auto (or 3600)
```

### **2. MX Record (Email Routing)**
```
Type: MX
Name: send
Content: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: Auto (or 3600)
```

### **3. SPF Record (Email Authentication)**
```
Type: TXT
Name: send
Content: v=spf1 include:amazonses.com ~all
TTL: Auto (or 3600)
```

---

## 🔧 How to Add DNS Records

### **Where is Your Domain Registered?**

Common providers and where to add DNS:

**GoDaddy:**
1. Log in to GoDaddy
2. Go to "My Products" → "Domains"
3. Click "DNS" next to your domain
4. Click "Add" for each record

**Namecheap:**
1. Log in to Namecheap
2. Go to "Domain List"
3. Click "Manage" next to your domain
4. Click "Advanced DNS"
5. Click "Add New Record"

**Cloudflare:**
1. Log in to Cloudflare
2. Select your domain
3. Go to "DNS" tab
4. Click "Add record"

**Google Domains:**
1. Log in to Google Domains
2. Select your domain
3. Click "DNS" in left menu
4. Scroll to "Custom resource records"
5. Add each record

---

## 📝 Step-by-Step Instructions

### **Record 1: DKIM (TXT Record)**

1. **Type:** Select "TXT"
2. **Name/Host:** Enter `resend._domainkey`
   - Some providers: Just `resend._domainkey`
   - Others: `resend._domainkey.yourdomain.com`
3. **Value/Content:** Paste the long string starting with `p=MIGfMA0...`
4. **TTL:** Leave as "Auto" or "3600"
5. Click **"Save"** or **"Add Record"**

**Example:**
```
Type: TXT
Host: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDMKEyVNVYuEGXhaYfRwwxCMrZvqCpa0ix1QwvRLaBrO4EHsx0wk10MofUyWdF7EpHSuG9wzfyJ+R1Py68oZ3d4Z7GaivFL2P6vHlP0u/Z/mHyz22UsHQot5jKJ1qx+TshwRL5byyk4rwEV49b1RQ/Ew0I41G3SkBtn295QY55jhQIDAQAB
TTL: Auto
```

---

### **Record 2: MX Record (Mail Exchange)**

1. **Type:** Select "MX"
2. **Name/Host:** Enter `send`
   - Some providers: Just `send`
   - Others: `send.yourdomain.com`
3. **Value/Points to:** `feedback-smtp.us-east-1.amazonses.com`
4. **Priority:** `10`
5. **TTL:** Leave as "Auto" or "3600"
6. Click **"Save"** or **"Add Record"**

**Example:**
```
Type: MX
Host: send
Points to: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: Auto
```

---

### **Record 3: SPF (TXT Record)**

1. **Type:** Select "TXT"
2. **Name/Host:** Enter `send`
   - Some providers: Just `send`
   - Others: `send.yourdomain.com`
3. **Value/Content:** `v=spf1 include:amazonses.com ~all`
4. **TTL:** Leave as "Auto" or "3600"
5. Click **"Save"** or **"Add Record"**

**Example:**
```
Type: TXT
Host: send
Value: v=spf1 include:amazonses.com ~all
TTL: Auto
```

---

## ⏱️ **Wait for DNS Propagation**

After adding all records:
- **Wait:** 5-30 minutes (sometimes up to 24 hours)
- **Check:** Resend dashboard will show green checkmarks when ready
- **Status:** Will change from "Missing" to "Verified"

---

## ✅ **Verify Records Are Added**

### **Option 1: Check in Resend Dashboard**
1. Go back to Resend
2. Refresh the page
3. Wait for green checkmarks

### **Option 2: Check Manually**
```bash
# Check DKIM record
dig TXT resend._domainkey.yourdomain.com

# Check MX record
dig MX send.yourdomain.com

# Check SPF record
dig TXT send.yourdomain.com
```

### **Option 3: Online Tool**
- Go to: https://mxtoolbox.com/SuperTool.aspx
- Enter: `resend._domainkey.yourdomain.com`
- Check if record exists

---

## 🚨 **Common Issues & Fixes**

### **Issue 1: "Name" field confusion**

**If your provider asks for full domain:**
- Use: `resend._domainkey.yourdomain.com`
- Instead of: `resend._domainkey`

**If provider adds domain automatically:**
- Use: `resend._domainkey`
- Provider adds: `.yourdomain.com`

**Test which one your provider uses!**

---

### **Issue 2: Existing SPF record**

**If you already have an SPF record:**

Instead of adding a new record for `send`, you need to:

**Option A:** Use subdomain (recommended)
- Keep `send` subdomain for Resend
- Your main domain keeps existing SPF

**Option B:** Merge SPF records (advanced)
- If you must send from main domain
- Combine: `v=spf1 include:amazonses.com include:existing.com ~all`

**For Resend, Option A is easier - use the `send` subdomain!**

---

### **Issue 3: Records not showing in Resend**

**Wait longer:**
- DNS can take 5-30 minutes
- Sometimes up to 24 hours
- Be patient!

**Check your work:**
- Verify Type is correct (TXT vs MX)
- Verify Name is exactly right
- Verify Content is complete (no spaces/breaks)

**Try refreshing:**
- Click "Check Records" in Resend
- Clear browser cache
- Try different browser

---

## 📧 **After DNS is Verified**

Once all 3 records show ✅ green checkmarks:

### **Update your .env:**

```env
# Update this line:
RESEND_FROM_EMAIL=orders@send.yourdomain.com
# Or if you configured apex domain:
RESEND_FROM_EMAIL=orders@yourdomain.com
```

**Note the subdomain!** 
- If you used `send` subdomain → Use `@send.yourdomain.com`
- If you configured apex → Use `@yourdomain.com`

### **Restart your server:**
```bash
npm start
```

### **Test it:**
```bash
# Place a test order or run:
node test-email-outlook.js
```

---

## 🎯 **Quick Checklist**

- [ ] Add DKIM record (TXT, resend._domainkey)
- [ ] Add MX record (MX, send, priority 10)
- [ ] Add SPF record (TXT, send, v=spf1...)
- [ ] Wait 5-30 minutes
- [ ] Check Resend dashboard for green checkmarks
- [ ] Update RESEND_FROM_EMAIL in .env
- [ ] Restart server
- [ ] Test sending email
- [ ] Verify email arrives and doesn't go to spam

---

## 💡 **Using a Subdomain (Recommended)**

**Best practice: Use `send.yourdomain.com` for Resend emails**

**Why?**
- Keeps your main domain clean
- No conflicts with existing email
- Easier DNS management
- Standard practice

**Your emails will be:**
- `orders@send.yourdomain.com`
- `noreply@send.yourdomain.com`

**This is professional and works perfectly!**

---

## 🆘 **Still Having Issues?**

### **Check DNS Records:**
```bash
# All in one command:
echo "DKIM:" && dig TXT resend._domainkey.yourdomain.com +short
echo "MX:" && dig MX send.yourdomain.com +short
echo "SPF:" && dig TXT send.yourdomain.com +short
```

### **Common Errors:**

**"Record already exists"**
→ You might already have a record with that name
→ Delete old record or use different subdomain

**"Invalid format"**
→ Check for extra spaces or line breaks
→ Content must be on one line
→ Don't include quotes unless provider requires them

**"Not verified after 24 hours"**
→ Double-check Name field (with/without domain)
→ Try deleting and re-adding
→ Contact your domain provider support

---

## ✅ **Success!**

When all records are verified:
- ✅ Green checkmarks in Resend dashboard
- ✅ "Sending: Active" status
- ✅ Emails send successfully
- ✅ Good deliverability (not spam)

**Your hybrid email system is now fully operational!** 🎉

---

## 📚 **Resources**

- Resend Docs: https://resend.com/docs/dashboard/domains/introduction
- DNS Checker: https://dnschecker.org
- MX Toolbox: https://mxtoolbox.com
- Your domain provider's DNS help docs

---

**Need help?** Most domain providers have live chat support and can help you add these records!


