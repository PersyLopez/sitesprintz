# Temporary Email Workaround (Development Only)

## If you need to test WITHOUT a domain right now:

### Option: Log Emails to Console Instead

Update `.env`:
```bash
# Comment out or remove the RESEND_API_KEY temporarily
# RESEND_API_KEY=re_Vks2nssj_Cqv2Z47BUGxKxFiJXhWFuqvW
```

Now emails will be logged to the console instead of sent.

### What You'll See:
```
⚠️ RESEND_API_KEY not set. Email would be sent to: user@example.com
📧 Template: sitePublished Data: { siteName: 'Test Site', ... }
```

### Limitations:
- ❌ No actual emails sent
- ❌ Can't test password reset flow
- ❌ Can't test user invitations
- ✅ Can continue development
- ✅ See what emails would be sent

---

## Recommended: Add a Domain ASAP

This is only for temporary testing. You'll need a real domain for:
- User password resets
- Professional appearance
- Production deployment

