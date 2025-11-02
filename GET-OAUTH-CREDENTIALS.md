# 🔑 Get OAuth Credentials - Quick Guide

## You'll need these to enable Google + Apple Sign In

---

## 1️⃣ Google OAuth Setup (5 minutes)

### **Step 1: Go to Google Cloud Console**
```
https://console.cloud.google.com/
```

### **Step 2: Create or Select Project**
- Click "Select a project" at the top
- Click "New Project"
- Name: "SiteSprintz"
- Click "Create"

### **Step 3: Enable Google+ API**
- Go to "APIs & Services" → "Library"
- Search for "Google+ API"
- Click "Enable"

### **Step 4: Create OAuth Credentials**
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth 2.0 Client ID"
- If prompted, configure consent screen:
  - User Type: External
  - App name: SiteSprintz
  - User support email: persy@sitesprintz.com
  - Developer contact: persy@sitesprintz.com
  - Click "Save and Continue" (skip scopes, test users)

### **Step 5: Configure OAuth Client**
- Application type: **Web application**
- Name: "SiteSprintz Web"
- Authorized JavaScript origins:
  ```
  http://localhost:3000
  https://tenurial-subemarginate-fay.ngrok-free.dev
  ```
- Authorized redirect URIs:
  ```
  http://localhost:3000/auth/google/callback
  https://tenurial-subemarginate-fay.ngrok-free.dev/auth/google/callback
  ```
- Click "Create"

### **Step 6: Copy Credentials**
You'll see a popup with:
- ✅ **Client ID**: `xxxxx.apps.googleusercontent.com`
- ✅ **Client Secret**: `xxxxx`

**Save these! You'll need them for .env file**

---

## 2️⃣ Apple Sign In Setup (Optional for now)

Apple setup is more complex and requires:
- Paid Apple Developer account ($99/year)
- Domain verification
- Certificate management

### **Quick Decision:**
- **Skip Apple for now**: Still get 85%+ coverage with just Google
- **Add later**: Can implement when ready for App Store

### **If you want Apple now:**
1. Go to: https://developer.apple.com/account/
2. Join Apple Developer Program ($99/year)
3. Follow detailed setup (15-30 minutes)

**My recommendation**: Start with Google only, add Apple later if needed.

---

## 3️⃣ Update Your .env File

After getting Google credentials, add to `.env`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# For production (ngrok)
BASE_URL=https://tenurial-subemarginate-fay.ngrok-free.dev
```

---

## ✅ Checklist

Before continuing:
- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Added to .env file

---

## 🚀 Once You Have the Credentials

Send me:
1. ✅ Confirmation that you added them to .env
2. The Client ID (just to verify format - don't share the secret!)

Then I'll:
1. Implement the OAuth backend routes
2. Update the frontend with Google button
3. Test the complete flow
4. Get you up and running!

---

## ⏱️ Time Estimate

- **Google setup**: 5 minutes
- **Backend implementation**: 10 minutes (I'll do this)
- **Testing**: 5 minutes
- **Total**: ~20 minutes to working Google auth!

---

## 🆘 Need Help?

If you get stuck:
1. Share a screenshot of where you're stuck
2. I'll guide you through it
3. Or we can start with just email/password for now

---

**Let me know when you have the credentials, and I'll complete the implementation!** 🎯


