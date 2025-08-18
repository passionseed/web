# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth for your Supabase application alongside the existing Discord OAuth.

## Prerequisites

- A Google Cloud Console account
- Access to your Supabase project dashboard
- The application code with Google OAuth implementation already added

## Step 1: Google Cloud Console Setup

### 1.1 Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Either create a new project or select an existing one
3. Note down your Project ID for reference

### 1.2 Enable Required APIs

1. Navigate to **APIs & Services** → **Library**
2. Search for and enable the following APIs:
   - **Google+ API** (for user profile information)
   - **People API** (recommended for better profile data)

### 1.3 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **User Type**:
   - **Internal**: Only for Google Workspace users (if your organization uses Google Workspace)
   - **External**: For public applications (recommended for most cases)

3. Fill in the **App Information**:
   - **Application name**: Your application name (e.g., "My Learning Platform")
   - **User support email**: Your support email address
   - **Application logo**: Optional but recommended
   - **Application home page**: Your application URL
   - **Application privacy policy link**: Your privacy policy URL
   - **Application terms of service link**: Your terms of service URL

4. Add **Authorized domains**:
   - Add your production domain (e.g., `yourdomain.com`)
   - For local development, you don't need to add `localhost`

5. Configure **Developer contact information**:
   - Add your email address

6. Click **Save and Continue**

### 1.4 Add Required Scopes

1. In the **Scopes** section, click **Add or Remove Scopes**
2. Add the following scopes:
   - `../auth/userinfo.email` - Access to user's email
   - `../auth/userinfo.profile` - Access to user's basic profile
   - `openid` - OpenID Connect scope

3. Click **Update** and then **Save and Continue**

### 1.5 Add Test Users (For External Apps in Testing)

If you selected "External" and your app is in testing mode:
1. Add test user email addresses in the **Test users** section
2. These users will be able to access your app during development

### 1.6 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Select **Application type**: **Web application**
4. Give it a name (e.g., "My App OAuth Client")

5. Configure **Authorized JavaScript origins**:
   - `http://localhost:3000` (for local development)
   - `https://yourdomain.com` (for production)

6. Configure **Authorized redirect URIs**:
   - You'll get this from Supabase in the next step
   - It will be in the format: `https://[your-project-ref].supabase.co/auth/v1/callback`

7. Click **Create**
8. **Important**: Copy and save the **Client ID** and **Client Secret** - you'll need these for Supabase

## Step 2: Supabase Configuration

### 2.1 Get the Redirect URL

1. Open your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find the **Google** provider in the list
4. Copy the **Redirect URL** shown (it will be in the format: `https://[your-project-ref].supabase.co/auth/v1/callback`)

### 2.2 Update Google OAuth Client

1. Go back to Google Cloud Console → **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. In **Authorized redirect URIs**, add the Supabase redirect URL you copied
4. Click **Save**

### 2.3 Configure Google Provider in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** in the provider list
3. Toggle it to **Enabled**
4. Fill in the configuration:
   - **Client ID**: Paste the Client ID from Google Console
   - **Client Secret**: Paste the Client Secret from Google Console
5. **Optional configurations**:
   - **Skip email confirmation**: Toggle based on your requirements
   - **Additional scopes**: Leave default unless you need specific permissions
6. Click **Save**

## Step 3: Environment Variables Setup

### 3.1 Update Local Environment

1. Open your `.env.local` file
2. Replace the placeholder values with your actual Google OAuth credentials:

```env
# Google OAuth Configuration
SUPABASE_AUTH_GOOGLE_CLIENT_ID=your_actual_google_client_id_here
SUPABASE_AUTH_GOOGLE_SECRET=your_actual_google_client_secret_here
```

### 3.2 Production Environment

For production deployment, add these environment variables to your hosting platform:

**Vercel:**
1. Go to your project dashboard on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `SUPABASE_AUTH_GOOGLE_CLIENT_ID` = your Google Client ID
   - `SUPABASE_AUTH_GOOGLE_SECRET` = your Google Client Secret

**Other platforms:** Follow your platform's documentation for setting environment variables.

## Step 4: Testing the Implementation

### 4.1 Local Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your login page
3. You should see both Discord and Google sign-in buttons
4. Click the **Sign in with Google** button
5. You should be redirected to Google's OAuth consent screen
6. After granting permissions, you should be redirected back to your app

### 4.2 Troubleshooting Common Issues

**"redirect_uri_mismatch" error:**
- Ensure the redirect URI in Google Console exactly matches the one from Supabase
- Check that you're using the correct environment (dev vs production URLs)

**"access_blocked" error:**
- Your OAuth consent screen might not be approved for external users
- Add your email as a test user, or request verification from Google

**Button not appearing:**
- Check browser console for JavaScript errors
- Verify that the Google icon package is installed: `@icons-pack/react-simple-icons`

**Environment variable issues:**
- Restart your development server after updating `.env.local`
- Verify that variable names match exactly

### 4.3 Testing Checklist

- [ ] Google OAuth button appears on login page
- [ ] Clicking button redirects to Google OAuth consent screen
- [ ] User can grant permissions and authenticate
- [ ] User is redirected back to the application
- [ ] User session is created successfully
- [ ] Profile completion flow works (if applicable)
- [ ] User can sign out and sign back in
- [ ] Error handling works for denied permissions

## Step 5: Production Deployment

### 5.1 Pre-deployment Checklist

- [ ] Google OAuth client configured with production redirect URI
- [ ] Supabase Google provider configured with production credentials
- [ ] Environment variables set in production hosting platform
- [ ] OAuth consent screen configured for production domain
- [ ] SSL certificate configured for production domain

### 5.2 Verification for Production

1. **Domain Verification** (if required):
   - For production apps, Google may require domain verification
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add and verify your domain

2. **OAuth Consent Screen Review**:
   - For external apps with sensitive scopes, Google may require app review
   - Submit for verification if prompted

### 5.3 Go Live

1. Deploy your application with the updated code
2. Test the Google OAuth flow in production
3. Monitor logs for any authentication errors
4. Verify that both Discord and Google OAuth work correctly

## Security Best Practices

### Environment Variables
- Never commit OAuth secrets to version control
- Use different credentials for development and production
- Regularly rotate OAuth credentials
- Use your platform's secure environment variable storage

### OAuth Configuration
- Use HTTPS only in production
- Keep redirect URIs as specific as possible
- Regularly review and audit OAuth permissions
- Monitor authentication logs for suspicious activity

### User Data
- Only request the minimum required OAuth scopes
- Clearly communicate what data you're accessing
- Provide privacy policy and terms of service
- Allow users to revoke OAuth permissions

## Monitoring and Maintenance

### Key Metrics to Track
- OAuth success/failure rates
- Authentication errors in logs
- User sign-in preferences (Discord vs Google vs email)
- Performance impact of multiple OAuth providers

### Regular Maintenance
- Review OAuth credentials quarterly
- Update OAuth scopes if app requirements change
- Monitor Google OAuth API changes and deprecations
- Keep authentication dependencies updated

## Getting Help

### Common Resources
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

### Support Channels
- Supabase Discord community
- Google Cloud Support (for Google Console issues)
- Stack Overflow for technical questions

## Conclusion

You should now have Google OAuth working alongside Discord OAuth in your application. Users can choose between multiple sign-in options, providing a better user experience and increased accessibility.

The implementation is designed to work seamlessly with your existing authentication flow, requiring no changes to the callback handling or user profile management systems.