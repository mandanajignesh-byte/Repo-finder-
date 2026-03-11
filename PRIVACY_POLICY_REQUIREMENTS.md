# Privacy Policy Requirements for App Store Submission

## Overview
This document outlines the privacy policy requirements for RepoVerse app submission to Apple App Store and Google Play Store, specifically for apps with in-app purchases and subscriptions.

---

## Required Privacy Policy Sections

### 1. **Data Collection and Usage**
- **What data you collect:**
  - User account information (if applicable)
  - GitHub repository preferences and interactions
  - App usage analytics
  - Subscription and payment information (handled by Apple/Google)
  
- **How you use the data:**
  - To provide personalized repository recommendations
  - To improve app functionality
  - To process subscriptions (via RevenueCat/Apple/Google)

### 2. **Third-Party Services**
- **RevenueCat** - Subscription management
- **Supabase** - Backend database and authentication
- **GitHub API** - Repository data fetching
- **Apple/Google** - Payment processing

### 3. **Subscription Information**
- Clear pricing ($4.99/month, $45.99/year)
- Free trial terms (14-day free trial for yearly plan)
- Auto-renewal details
- Cancellation policy
- Refund policy (follows App Store/Play Store policies)

### 4. **User Rights**
- Right to access personal data
- Right to delete account/data
- Right to opt-out of data collection (if applicable)
- Right to cancel subscription

### 5. **Data Security**
- How you protect user data
- Encryption methods
- Data retention policies

### 6. **Contact Information**
- Support email
- Company/Developer contact information
- Privacy policy update date

---

## Apple App Store Specific Requirements

### Required Disclosures:
1. **Privacy Policy URL** - Must be accessible and up-to-date
2. **Data Collection Types** - Declare in App Store Connect:
   - Identifiers (User ID)
   - Usage Data (App interactions)
   - Diagnostics (Crash logs, if collected)
   - Purchases (Subscription status - handled by Apple)

3. **Data Usage Purposes:**
   - App Functionality
   - Analytics
   - Personalization

4. **Data Linked to User** - Yes (for personalized recommendations)

5. **Data Used to Track User** - No (unless you use analytics that track across apps)

### Subscription-Specific Requirements:
- **Clear pricing display** - Already in paywall
- **Free trial disclosure** - Must be clearly stated (14-day trial)
- **Auto-renewal notice** - Required in subscription terms
- **Cancellation instructions** - Must be easily accessible

---

## Google Play Store Specific Requirements

### Required Disclosures:
1. **Privacy Policy URL** - Required in Play Console
2. **Data Safety Section** - Must complete:
   - Data collection types
   - Data sharing practices
   - Security practices
   - Data deletion options

3. **Subscription Requirements:**
   - Clear pricing
   - Free trial terms
   - Cancellation policy
   - Refund policy (Google Play's standard policy)

---

## Sample Privacy Policy Structure

```markdown
# RepoVerse Privacy Policy

**Last Updated: [Date]**

## 1. Introduction
RepoVerse ("we", "our", "us") respects your privacy...

## 2. Information We Collect
- Account information
- Repository preferences
- Usage data
- Subscription information (via Apple/Google)

## 3. How We Use Your Information
- Provide personalized recommendations
- Process subscriptions
- Improve app functionality

## 4. Third-Party Services
- RevenueCat (subscription management)
- Supabase (backend services)
- GitHub API (repository data)

## 5. Subscription Terms
- Pricing: $4.99/month or $45.99/year
- Free Trial: 14-day free trial for yearly plan
- Auto-renewal: Subscriptions automatically renew
- Cancellation: Cancel anytime via App Store/Play Store settings

## 6. Your Rights
- Access your data
- Delete your account
- Cancel subscription

## 7. Data Security
We implement security measures to protect your data...

## 8. Contact Us
Email: support@repoverse.app
```

---

## Action Items

1. **Create Privacy Policy Page**
   - Host on your website (e.g., `https://repoverse.app/privacy`)
   - Or use a privacy policy generator service
   - Update the URLs in `paywall_screen.dart`

2. **Create Terms of Service**
   - Include subscription terms
   - Include cancellation policy
   - Include refund policy
   - Update the URL in `paywall_screen.dart`

3. **App Store Connect Setup**
   - Add Privacy Policy URL
   - Complete Data Collection disclosure
   - Set up subscription products

4. **Google Play Console Setup**
   - Add Privacy Policy URL
   - Complete Data Safety section
   - Set up subscription products

---

## Recommended Privacy Policy Generators

1. **Termly** - https://termly.io
2. **PrivacyPolicies.com** - https://www.privacypolicies.com
3. **iubenda** - https://www.iubenda.com

---

## Important Notes

- **GDPR Compliance** - If you have EU users, you must comply with GDPR
- **CCPA Compliance** - If you have California users, consider CCPA compliance
- **COPPA** - If your app targets children, additional requirements apply
- **Regular Updates** - Update privacy policy when you change data practices

---

## Resources

- [Apple App Store Privacy Guidelines](https://developer.apple.com/app-store/review/guidelines/#privacy)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [RevenueCat Privacy Best Practices](https://www.revenuecat.com/blog/privacy)

---

**Next Steps:**
1. Generate privacy policy using a service or create manually
2. Host it on your website
3. Update URLs in `paywall_screen.dart`
4. Complete App Store Connect and Play Console disclosures
5. Test paywall links before submission
