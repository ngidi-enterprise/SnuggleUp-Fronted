# GoDaddy Email Configuration Guide

## Required Environment Variables

Add these to your `backend/.env` file:

```env
# GoDaddy Email Settings
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=465
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=your-email-password
EMAIL_FROM=SnuggleUp <noreply@yourdomain.com>
```

## Setup Instructions

### 1. Get Your GoDaddy Email Credentials

**Option A: Using GoDaddy Workspace Email**
- Login to GoDaddy
- Go to Email & Office Dashboard
- Find your email account
- Use your full email address as `EMAIL_USER`
- Use your email password as `EMAIL_PASS`

**Option B: Using cPanel Email**
- Login to your hosting cPanel
- Navigate to Email Accounts
- Create or use existing email (e.g., `orders@yourdomain.com`)
- Set/reset password
- Use this email and password in .env

### 2. Configure Environment Variables

Edit `backend/.env`:

```env
# Example for GoDaddy
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=465
EMAIL_USER=orders@snuggleup.co.za
EMAIL_PASS=YourStrongPassword123!
EMAIL_FROM=SnuggleUp <orders@snuggleup.co.za>
```

### 3. Port Options

GoDaddy supports two ports:
- **Port 465** (SSL/TLS) - Recommended, secure
- **Port 587** (STARTTLS) - Alternative

If port 465 doesn't work, try:
```env
EMAIL_PORT=587
```

### 4. Deploy to Render

In Render dashboard:
1. Go to your backend service
2. Click "Environment" tab
3. Add each variable:
   - `EMAIL_HOST` = `smtpout.secureserver.net`
   - `EMAIL_PORT` = `465`
   - `EMAIL_USER` = `your-email@yourdomain.com`
   - `EMAIL_PASS` = `your-password`
   - `EMAIL_FROM` = `SnuggleUp <noreply@yourdomain.com>`
4. Click "Save Changes"
5. Render will auto-redeploy

### 5. Test Email Sending

After configuration, test by:
1. Create a test order
2. Submit to CJ in admin dashboard
3. Simulate CJ webhook (see testing section below)
4. Check customer email inbox

## Email Types

### 1. Order Confirmation Email
**Sent:** When order is created (after PayFast payment)
**Includes:** Order number, items, total amount

### 2. Shipping Notification Email
**Sent:** When CJ webhook receives tracking update
**Includes:** Order number, tracking number, tracking link

## Testing Webhooks Locally

**Step 1: Expose your local backend with ngrok**
```powershell
cd backend
ngrok http 3000
```

**Step 2: Simulate CJ webhook**
```powershell
# Replace with your ngrok URL
$webhookUrl = "https://abc123.ngrok.io/api/cj/webhook"

$body = @{
  eventType = "logistics"
  data = @{
    orderId = "CJ12345"  # Use real CJ order ID from your database
    trackingNumber = "TEST123456789"
    trackingUrl = "https://tracking.example.com/TEST123456789"
  }
} | ConvertTo-Json

Invoke-WebRequest -Uri $webhookUrl -Method POST -Body $body -ContentType "application/json"
```

**Expected Result:**
- Console logs tracking update
- Email sent to customer
- Order tracking info updated in database

## Troubleshooting

### Email Not Sending

**Check 1: Verify credentials**
```powershell
# From backend directory
node -e "console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS)"
```

**Check 2: Test SMTP connection**
Create `test-email.js`:
```javascript
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP Error:', error);
  } else {
    console.log('✅ SMTP Ready to send emails');
  }
});
```

Run: `node test-email.js`

**Check 3: GoDaddy firewall**
- Some GoDaddy hosting plans block outbound SMTP
- Contact GoDaddy support to whitelist port 465/587

**Check 4: Authentication failed**
- Reset email password in GoDaddy dashboard
- Ensure no special characters causing issues
- Try using app-specific password if 2FA enabled

### Common Errors

**Error: "Invalid login"**
- Double-check EMAIL_USER and EMAIL_PASS
- Ensure using full email address (not just username)

**Error: "Connection timeout"**
- Try port 587 instead of 465
- Check if hosting firewall blocks SMTP

**Error: "self signed certificate"**
- Already handled in code with `rejectUnauthorized: false`
- If persists, contact GoDaddy support

## Security Best Practices

1. **Never commit .env file to Git**
   ```bash
   # .gitignore already includes:
   .env
   .env.local
   ```

2. **Use strong email passwords**
   - Minimum 12 characters
   - Mix of letters, numbers, symbols

3. **Create dedicated email**
   - Use `noreply@yourdomain.com` or `orders@yourdomain.com`
   - Don't use personal email

4. **Monitor sending limits**
   - GoDaddy typically allows 250-500 emails/day
   - For higher volume, consider SendGrid or AWS SES

## Alternative Email Services (Optional)

If GoDaddy SMTP has issues, consider:

### SendGrid (Recommended for production)
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=SG.your-api-key-here
```

### Gmail (Development only)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
```
*Requires app-specific password*

### AWS SES (Enterprise)
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-aws-access-key
EMAIL_PASS=your-aws-secret-key
```

## Related Files

- `backend/src/services/emailService.js` - Email sending logic
- `backend/src/routes/cj.js` - Webhook handler that triggers emails
- `backend/src/routes/payments.js` - Order confirmation trigger (optional)

## Support

If you encounter issues:
1. Check backend console logs for error details
2. Test with `test-email.js` script above
3. Contact GoDaddy support for SMTP access
4. Consider switching to SendGrid for reliability
