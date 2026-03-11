# RevenueCat Setup Guide - Complete Step-by-Step

## 🎯 Overview

You need to configure:
1. ✅ **Products** - Monthly ($4.99) and Yearly ($45.99)
2. ✅ **Entitlement** - Repoverse Pro
3. ✅ **Offering** - Default offering with packages
4. ✅ **App Store Connect** - Create subscriptions
5. ✅ **Google Play Console** - Create subscriptions

---

## 📋 Step 1: Create Products in RevenueCat

### Go to Products Tab

1. **Navigate**: RevenueCat Dashboard → **Products** tab
2. **Click**: "New product" button (top right)

### Create Monthly Product

1. **Product Identifier**: `monthly`
2. **Store**: Select **Apple App Store** and **Google Play Store**
3. **Type**: Subscription
4. **Click**: "Create"

### Create Yearly Product

1. **Product Identifier**: `yearly`
2. **Store**: Select **Apple App Store** and **Google Play Store**
3. **Type**: Subscription
4. **Click**: "Create"

**Note**: You'll link these to actual App Store/Play Store products later.

---

## 📋 Step 2: Create Entitlement

### Go to Entitlements Tab

1. **Navigate**: RevenueCat Dashboard → **Entitlements** tab
2. **Click**: "New entitlement" button

### Create Repoverse Pro Entitlement

1. **Entitlement Identifier**: `Repoverse Pro`
2. **Display Name**: Repoverse Pro (optional)
3. **Click**: "Create"

### Link Products to Entitlement

1. **Click** on the `Repoverse Pro` entitlement you just created
2. **Click**: "Attach products"
3. **Select**: 
   - ✅ `monthly`
   - ✅ `yearly`
4. **Click**: "Attach"

---

## 📋 Step 3: Create Offering

### Go to Offerings Tab

1. **Navigate**: RevenueCat Dashboard → **Offerings** tab
2. **Click**: "New offering" button

### Create Default Offering

1. **Offering Identifier**: `default`
2. **Display Name**: Default (optional)
3. **Click**: "Create"

### Add Packages to Offering

1. **Click** on the `default` offering you just created
2. **Click**: "Add package" button

#### Add Monthly Package

1. **Package Identifier**: `monthly` (or leave default)
2. **Product**: Select `monthly` product
3. **Package Type**: Monthly
4. **Click**: "Add package"

#### Add Annual Package

1. **Package Identifier**: `annual` (or leave default)
2. **Product**: Select `yearly` product
3. **Package Type**: Annual
4. **Click**: "Add package"

---

## 📋 Step 4: Configure App Store Connect (iOS)

### Prerequisites

- Apple Developer Account ($99/year)
- App registered in App Store Connect

### Create Subscription Group

1. **Go to**: [App Store Connect](https://appstoreconnect.apple.com)
2. **Navigate**: Your App → **Features** → **In-App Purchases**
3. **Click**: "Create Subscription Group"
4. **Name**: "Repoverse Pro" (or any name)
5. **Click**: "Create"

### Create Monthly Subscription

1. **In your subscription group**, click "+" to add subscription
2. **Reference Name**: Monthly Subscription
3. **Product ID**: `monthly` (must match RevenueCat!)
4. **Subscription Duration**: 1 Month
5. **Price**: $4.99
6. **Free Trial**: None (leave empty)
7. **Click**: "Create"
8. **Fill in**:
   - Subscription Display Name: "Repoverse Pro Monthly"
   - Description: "Monthly subscription to Repoverse Pro"
   - Review Information (screenshots, description)
9. **Click**: "Save"

### Create Yearly Subscription

1. **In same subscription group**, click "+" to add another subscription
2. **Reference Name**: Yearly Subscription
3. **Product ID**: `yearly` (must match RevenueCat!)
4. **Subscription Duration**: 1 Year
5. **Price**: $45.99
6. **Free Trial**: **14 Days** (IMPORTANT!)
7. **Click**: "Create"
8. **Fill in**:
   - Subscription Display Name: "Repoverse Pro Yearly"
   - Description: "Yearly subscription to Repoverse Pro with 14-day free trial"
   - Review Information
9. **Click**: "Save"

### Link to RevenueCat

1. **Go to**: [RevenueCat Dashboard](https://app.revenuecat.com) → **Products** tab
2. **Click** on the `monthly` product
3. **Click**: "Link store product" button (or "Add store product")
4. **Select**: **Apple App Store**
5. **Fill in**:
   - **Bundle ID**: `com.repoverse.app` ⚠️ **Must match your App ID!**
   - **Product**: Select `monthly` from the dropdown (the one you created in App Store Connect)
6. **Click**: "Link" or "Save"

7. **Repeat for `yearly` product**:
   - Go to **Products** → `yearly`
   - Click "Link store product"
   - Select **Apple App Store**
   - Bundle ID: `com.repoverse.app`
   - Product: Select `yearly`
   - Click "Link"

---

## 📋 Step 5: Configure Google Play Console (Android)

### Prerequisites

- Google Play Developer Account ($25 one-time)
- App registered in Google Play Console

### Create Subscription Products

1. **Go to**: [Google Play Console](https://play.google.com/console)
2. **Navigate**: Your App → **Monetize** → **Products** → **Subscriptions**
3. **Click**: "Create subscription"

### Create Monthly Subscription

1. **Product ID**: `monthly` (must match RevenueCat!)
2. **Name**: Repoverse Pro Monthly
3. **Description**: Monthly subscription to Repoverse Pro
4. **Billing period**: Monthly
5. **Price**: $4.99
6. **Free trial**: None
7. **Click**: "Save"

### Create Yearly Subscription

1. **Click**: "Create subscription" again
2. **Product ID**: `yearly` (must match RevenueCat!)
3. **Name**: Repoverse Pro Yearly
4. **Description**: Yearly subscription to Repoverse Pro with 14-day free trial
5. **Billing period**: Yearly
6. **Price**: $45.99
7. **Free trial**: **14 days** (IMPORTANT!)
8. **Click**: "Save"

### Link to RevenueCat

1. **Go back to**: RevenueCat Dashboard → **Products** → `monthly`
2. **Click**: "Link store product"
3. **Select**: Google Play Store
4. **Enter**: Your App's Package Name
5. **Select**: The `monthly` product you created in Play Console
6. **Click**: "Link"

7. **Repeat** for `yearly` product

---

## 📋 Step 6: Verify Configuration

### Check Products

1. **Go to**: RevenueCat Dashboard → **Products**
2. **Verify**:
   - ✅ `monthly` exists
   - ✅ `yearly` exists
   - ✅ Both show "Linked" status for iOS and Android

### Check Entitlement

1. **Go to**: RevenueCat Dashboard → **Entitlements**
2. **Click**: `Repoverse Pro`
3. **Verify**:
   - ✅ `monthly` product is attached
   - ✅ `yearly` product is attached

### Check Offering

1. **Go to**: RevenueCat Dashboard → **Offerings**
2. **Click**: `default`
3. **Verify**:
   - ✅ Monthly package exists
   - ✅ Annual package exists
   - ✅ Both packages are linked to correct products

---

## 🧪 Step 7: Test Setup

### Test in Sandbox Mode

1. **RevenueCat Dashboard**: Toggle "Sandbox data" ON (top right)
2. **Create test user** in App Store Connect / Play Console
3. **Run your app** on device/emulator
4. **Trigger paywall** (complete onboarding)
5. **Test purchase** with sandbox account
6. **Verify**:
   - ✅ Paywall shows both plans
   - ✅ Prices display correctly ($4.99/month, $45.99/year)
   - ✅ Yearly shows "14-day free trial"
   - ✅ Purchase completes
   - ✅ Subscription activates

---

## 🔑 Important Notes

### Product IDs Must Match

- RevenueCat Product ID: `monthly` → App Store Product ID: `monthly` ✅
- RevenueCat Product ID: `yearly` → App Store Product ID: `yearly` ✅

**If they don't match, purchases won't work!**

### Free Trial Configuration

- **Yearly plan**: Set 14-day free trial in App Store Connect / Play Console
- RevenueCat will automatically detect and display it
- Your app code already handles this correctly

### API Key

- Your **test API key** is already configured: `test_AicJXufprKBUEFVnpevpTRDgDfq`
- For production, you'll need to switch to your **production API key**
- Find it in: RevenueCat Dashboard → **Project Settings** → **API Keys**

---

## 📱 Your App Code is Ready

Your Flutter app is already configured with:
- ✅ API Key: `test_AicJXufprKBUEFVnpevpTRDgDfq`
- ✅ Entitlement ID: `Repoverse Pro`
- ✅ Product IDs: `monthly`, `yearly`
- ✅ Offering ID: `default`
- ✅ Paywall UI with free trial display

**Once you complete the RevenueCat dashboard setup, everything will work!**

---

## 🚨 Common Issues & Solutions

### Issue: Products not showing in paywall

**Solution**:
- Verify products are linked to App Store/Play Store
- Check offering has packages added
- Ensure offering identifier is `default`

### Issue: Free trial not showing

**Solution**:
- Verify 14-day trial is set in App Store Connect/Play Console
- Check it's set on the **yearly** product, not monthly
- Wait a few minutes for RevenueCat to sync

### Issue: Purchase fails

**Solution**:
- Use sandbox test account
- Verify product IDs match exactly
- Check API key is correct
- Ensure app is signed with correct provisioning profile

---

## ✅ Checklist

- [ ] Created `monthly` product in RevenueCat
- [ ] Created `yearly` product in RevenueCat
- [ ] Created `Repoverse Pro` entitlement
- [ ] Linked both products to entitlement
- [ ] Created `default` offering
- [ ] Added monthly package to offering
- [ ] Added annual package to offering
- [ ] Created monthly subscription in App Store Connect
- [ ] Created yearly subscription in App Store Connect (with 14-day trial)
- [ ] Linked App Store products to RevenueCat
- [ ] Created monthly subscription in Play Console
- [ ] Created yearly subscription in Play Console (with 14-day trial)
- [ ] Linked Play Console products to RevenueCat
- [ ] Tested in sandbox mode
- [ ] Verified free trial shows for yearly plan

---

## 🎉 You're Done!

Once all steps are complete:
1. Your paywall will show both plans
2. Prices will display correctly
3. Free trial will show for yearly
4. Purchases will work
5. Subscriptions will activate

**Need help?** Check RevenueCat docs: https://www.revenuecat.com/docs
