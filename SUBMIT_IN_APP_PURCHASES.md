# Submit In-App Purchases to Apple - Step by Step

## 🎯 Current Status
Your products show **"Ready to Submit"** status, which means:
- ✅ All metadata is filled
- ✅ Products are created
- ⚠️ **Not yet submitted to Apple for review**

## 📋 Submission Steps

### Step 1: Submit Monthly Subscription

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Navigate**: **My Apps** → **Repoverse** → **Features** → **In-App Purchases**
3. **Find**: "Monthly Subscription" product
4. **Click** on the product to open details
5. **Scroll down** to the bottom of the page
6. **Click**: **"Submit for Review"** button (top right, blue button)
7. **Confirm** the submission

### Step 2: Submit Yearly Subscription

1. **In the same In-App Purchases page**, find "Yearly" product
2. **Click** on the product to open details
3. **Click**: **"Submit for Review"** button (top right)
4. **Confirm** the submission

### Step 3: Verify Submission Status

After submitting, the status will change:
- **Before**: "Ready to Submit" (yellow/red indicator)
- **After**: "Waiting for Review" (yellow indicator)
- **Then**: "In Review" (yellow indicator)
- **Finally**: "Approved" (green indicator) ✅

---

## ⏱️ Timeline

- **Submission**: Immediate (you do it now)
- **Review Time**: Usually 24-48 hours (can be faster)
- **Approval**: Once approved, products are available

---

## 🧪 Testing While Waiting

### Option 1: Sandbox Testing (Can work before approval)

Even before approval, you can test in **Sandbox mode**:

1. **Create Sandbox Test Account** (if not done):
   - App Store Connect → **Users and Access** → **Sandbox Testers**
   - Click **"+"** → Add test email
   - Save

2. **Test on Physical Device**:
   - Sign out of your Apple ID in **Settings** → **App Store**
   - Run your app
   - Try to purchase → Will prompt for sandbox account
   - Sign in with sandbox test account
   - Complete purchase

**Note**: Sandbox testing might work even with "Ready to Submit" status, but it's not guaranteed. Submitting is the proper next step.

### Option 2: Wait for Approval

Once products are **"Approved"**, they will work in both:
- ✅ Sandbox testing
- ✅ Production

---

## 🔗 After Approval: Link to RevenueCat

Once products are **"Approved"**:

1. **Go to RevenueCat Dashboard**: https://app.revenuecat.com
2. **Navigate**: **Products** → Click on `monthly`
3. **Verify**: Store Status should show **"Linked"** or **"Active"**
4. **If not linked**:
   - Click **"Link store product"**
   - Select **Apple App Store**
   - Enter Bundle ID: `com.repoverse.app`
   - Select `monthly` product
   - Click **"Link"**
5. **Repeat** for `yearly` product

---

## ✅ Verification Checklist

After submission and approval:

- [ ] Monthly subscription status: **"Approved"** (green)
- [ ] Yearly subscription status: **"Approved"** (green)
- [ ] Products show as **"Linked"** in RevenueCat
- [ ] Offerings load successfully in app (no ConfigurationError)
- [ ] Paywall displays both monthly and yearly options
- [ ] Sandbox testing works

---

## 🚨 Important Notes

### 1. App Binary Not Required
- You can submit in-app purchases **without** submitting your app binary
- They will be reviewed independently
- Once approved, they're available for your app

### 2. Review Information Required
Make sure you've filled:
- ✅ Subscription Display Name
- ✅ Description
- ✅ Review Screenshot (paywall screenshot)
- ✅ Review Notes

### 3. Free Trial
- Yearly subscription has 14-day free trial
- This is already configured ✅
- Apple will review this as part of the submission

### 4. Pricing
- Make sure pricing is correct before submitting
- You can change pricing later, but it requires re-review

---

## 📞 If Review is Rejected

If Apple rejects your in-app purchases:

1. **Check rejection reason** in App Store Connect
2. **Common issues**:
   - Missing or unclear description
   - Missing review screenshot
   - Pricing issues
   - Free trial configuration issues
3. **Fix the issues** and resubmit

---

## 🎯 Next Steps After Approval

1. **Verify in RevenueCat**:
   - Products should show as "Linked"
   - Offerings should load without errors

2. **Test in App**:
   - Run app
   - Complete onboarding
   - Paywall should display both options
   - Test purchase in sandbox

3. **Monitor**:
   - Check RevenueCat dashboard for purchase events
   - Verify subscription status updates correctly

---

## 🔍 Current Issue

The error you're seeing:
```
ConfigurationError: There are no products registered in the RevenueCat dashboard for your offerings
```

**This will be resolved once**:
1. ✅ Products are submitted to Apple (you're doing this now)
2. ✅ Products are approved by Apple (24-48 hours)
3. ✅ Products are properly linked in RevenueCat (automatic or manual)

---

## 📝 Quick Reference

**App Store Connect**: https://appstoreconnect.apple.com
**RevenueCat Dashboard**: https://app.revenuecat.com
**Bundle ID**: `com.repoverse.app`
**Product IDs**: `monthly`, `yearly`

---

**Ready to submit?** Go to App Store Connect and click "Submit for Review" on both products! 🚀
