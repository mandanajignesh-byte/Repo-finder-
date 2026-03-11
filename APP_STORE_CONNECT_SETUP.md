# App Store Connect Setup - Step by Step

## 📋 Current Step: App ID Registration

### ✅ Complete App ID Registration

**In Apple Developer Portal (where you are now):**

1. **Description**: 
   - Enter: `Repoverse App` or `RepoVerse - GitHub Repository Discovery`

2. **Bundle ID**:
   - Select: **Explicit** (already selected)
   - Enter: `com.repoverse.app` ✅ (You've already done this!)

3. **Capabilities** (optional for now):
   - You can skip this for now - you can add capabilities later if needed

4. **Click**: "Continue" button (top right)

---

## 📋 Next Steps: App Store Connect

### Step 1: Create App in App Store Connect

1. **Go to**: [App Store Connect](https://appstoreconnect.apple.com)
2. **Navigate**: **My Apps** → Click **"+"** button (top left) → **New App**
3. **Fill in**:
   - **Platform**: iOS
   - **Name**: Repoverse (or RepoVerse)
   - **Primary Language**: English (or your preference)
   - **Bundle ID**: Select `com.repoverse.app` (the one you just created)
   - **SKU**: `repoverse-001` (any unique identifier)
   - **User Access**: Full Access (or Limited if you have a team)
4. **Click**: "Create"

---

### Step 2: Create Subscription Group

1. **In your app**, go to: **Features** tab → **In-App Purchases**
2. **Click**: "Create Subscription Group" button
3. **Name**: `Repoverse Pro`
4. **Click**: "Create"

---

### Step 3: Create Monthly Subscription

1. **In the subscription group**, click **"+"** button → **Auto-Renewable Subscription**
2. **Fill in**:
   - **Reference Name**: `Monthly Subscription`
   - **Product ID**: `monthly` ⚠️ **MUST MATCH RevenueCat!**
   - **Subscription Duration**: `1 Month`
   - **Price**: `$4.99` (or your preferred price)
   - **Free Trial**: Leave empty (no trial for monthly)
3. **Click**: "Create"
4. **Fill in Subscription Information**:
   - **Subscription Display Name**: `Repoverse Pro Monthly`
   - **Description**: `Monthly subscription to Repoverse Pro with unlimited swipes, personalized recommendations, and early access to trending repositories.`
   - **Review Information** (required for App Review):
     - Screenshot: Upload a screenshot of your paywall
     - Review Notes: "Monthly subscription for Repoverse Pro features"
5. **Click**: "Save"

---

### Step 4: Create Yearly Subscription

1. **In the same subscription group**, click **"+"** button again → **Auto-Renewable Subscription**
2. **Fill in**:
   - **Reference Name**: `Yearly Subscription`
   - **Product ID**: `yearly` ⚠️ **MUST MATCH RevenueCat!**
   - **Subscription Duration**: `1 Year`
   - **Price**: `$39.99` (or your preferred price)
   - **Free Trial**: `14 Days` ⚠️ **IMPORTANT!** Select "14 Days" from dropdown
3. **Click**: "Create"
4. **Fill in Subscription Information**:
   - **Subscription Display Name**: `Repoverse Pro Yearly`
   - **Description**: `Yearly subscription to Repoverse Pro with 14-day free trial. Includes unlimited swipes, personalized recommendations, smart badges, and early access to trending repositories.`
   - **Review Information**:
     - Screenshot: Upload a screenshot of your paywall
     - Review Notes: "Yearly subscription with 14-day free trial for Repoverse Pro features"
5. **Click**: "Save"

---

### Step 5: Link to RevenueCat

1. **Go to**: [RevenueCat Dashboard](https://app.revenuecat.com)
2. **Navigate**: **Products** tab → Click on `monthly` product
3. **Click**: "Link store product" button
4. **Select**: **Apple App Store**
5. **Enter**: 
   - **Bundle ID**: `com.repoverse.app`
   - **Product**: Select `monthly` from dropdown (the one you created in App Store Connect)
6. **Click**: "Link"
7. **Repeat** for `yearly` product:
   - Go to **Products** → `yearly`
   - Click "Link store product"
   - Select Apple App Store
   - Enter Bundle ID: `com.repoverse.app`
   - Select `yearly` product
   - Click "Link"

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] App ID created in Apple Developer Portal
- [ ] App created in App Store Connect
- [ ] Subscription group "Repoverse Pro" created
- [ ] Monthly subscription created with Product ID: `monthly`
- [ ] Yearly subscription created with Product ID: `yearly`
- [ ] Yearly subscription has 14-day free trial
- [ ] Monthly product linked in RevenueCat
- [ ] Yearly product linked in RevenueCat

---

## 🧪 Testing

### Create Sandbox Test Account

1. **In App Store Connect**: Go to **Users and Access** → **Sandbox Testers**
2. **Click**: "Add Sandbox Tester"
3. **Fill in**:
   - Email: Use a test email (e.g., `test@example.com`)
   - Password: Create a password
   - First/Last Name: Test User
   - Country: Your country
4. **Click**: "Save"

### Test in App

1. **Run your app** on a physical iOS device (sandbox doesn't work on simulator)
2. **Sign out** of your Apple ID in Settings → App Store
3. **Complete onboarding** to trigger paywall
4. **Try to purchase** → It will prompt for sandbox account
5. **Sign in** with your sandbox test account
6. **Complete purchase** → Should work!

---

## 🚨 Important Notes

### Product IDs Must Match Exactly

- RevenueCat Product ID: `monthly` → App Store Product ID: `monthly` ✅
- RevenueCat Product ID: `yearly` → App Store Product ID: `yearly` ✅

**If they don't match, purchases won't work!**

### Free Trial

- Only set on **yearly** subscription (14 days)
- RevenueCat will automatically detect and display it
- Your app code already handles this correctly

### Bundle ID

- ✅ **Current**: `com.repoverse.app` (Updated in Xcode project!)
- This is your production Bundle ID - perfect choice!

---

## 📞 Need Help?

- **RevenueCat Docs**: https://www.revenuecat.com/docs
- **App Store Connect Help**: https://help.apple.com/app-store-connect/
- **Apple Developer Support**: https://developer.apple.com/support/
