# Hard Paywall Setup Guide

## ✅ Apple-Style Paywall Implemented

Your paywall is now **Apple-style, clean, and minimal** with a **hard paywall** that blocks access until subscription.

---

## 🎨 Design Features

- **Apple-style design**: Clean, minimal, elegant
- **Brand colors**: Uses your blue (#0A84FF) and green (#34C759) palette
- **Hard paywall**: No close button, blocks access until subscription
- **Free trial display**: Prominently shows 14-day free trial for yearly plan

---

## 💰 Pricing Structure

### Monthly Plan
- **Price**: $4.99/month
- **Billing**: Monthly
- **Free Trial**: None

### Yearly Plan
- **Price**: $45.99/year
- **Billing**: Annual (charged after 14-day free trial)
- **Free Trial**: **14 days** (prominently displayed)
- **Best Value**: Badge shown

---

## 🚀 How to Use Hard Paywall

### Option 1: Wrap Entire App (Full Hard Paywall)

```dart
// In main.dart or your root widget
HardPaywallWrapper(
  child: YourAppContent(),
)
```

### Option 2: Show on App Launch

```dart
// In your splash screen or main screen
@override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    final isPro = ref.read(isProUserProvider);
    if (!isPro) {
      showHardPaywall(context);
    }
  });
}
```

### Option 3: Show for Specific Features

```dart
// Before accessing premium feature
final isPro = ref.watch(isProUserProvider);
if (!isPro) {
  final subscribed = await showHardPaywall(context);
  if (!subscribed) return; // Block access
}
```

---

## 📱 Paywall Features

### Visual Elements
- ✅ Clean logo with gradient (blue to green)
- ✅ Large, readable title
- ✅ Minimal feature list with icons
- ✅ Package cards with selection indicator
- ✅ Prominent free trial badge for yearly
- ✅ Clear pricing display
- ✅ Apple-style button ("Start Free Trial" for yearly)

### User Experience
- ✅ Smooth animations
- ✅ Haptic feedback on interactions
- ✅ Loading states
- ✅ Error handling
- ✅ Restore purchases option
- ✅ Legal links (Terms & Privacy)

---

## ⚙️ RevenueCat Configuration

### In RevenueCat Dashboard:

1. **Products** (Already created ✅)
   - `monthly` → $4.99/month
   - `yearly` → $45.99/year

2. **Entitlement** (Already created ✅)
   - `Repoverse Pro`

3. **Offerings** (Create/Verify)
   - `default` offering
   - Monthly package → `monthly` product
   - Annual package → `yearly` product

4. **Free Trial Setup** (Important!)
   - In **App Store Connect**: Set 14-day free trial for `yearly` product
   - In **Google Play Console**: Set 14-day free trial for `yearly` product
   - RevenueCat will automatically detect and display it

---

## 🧪 Testing

### Test Free Trial
1. Use **sandbox test account**
2. Select **Yearly** plan
3. Should see "14-day free trial" badge
4. Button should say "Start Free Trial"
5. After purchase, check subscription status

### Test Monthly Plan
1. Select **Monthly** plan
2. Should show "$4.99/month"
3. Button should say "Subscribe"
4. No free trial mentioned

---

## 📝 Code Structure

### Files Created/Updated:
- ✅ `lib/screens/paywall_screen.dart` - Apple-style paywall UI
- ✅ `lib/widgets/hard_paywall_wrapper.dart` - Hard paywall wrapper
- ✅ `lib/services/revenuecat_service.dart` - RevenueCat integration
- ✅ `lib/providers/subscription_provider.dart` - State management

---

## 🎯 Key Implementation Details

### Pricing Display
- Hardcoded fallback prices: $4.99/month, $45.99/year
- Falls back to RevenueCat prices if available
- Always shows correct format

### Free Trial Display
- Only shown for **Yearly** plan
- Prominent badge: "14-day free trial"
- Button text: "Start Free Trial"
- Subtitle: "Then charged annually"

### Hard Paywall Behavior
- **No close button** - user must subscribe
- Blocks access until subscription
- Can't dismiss without purchasing

---

## 🔧 Customization

### Change Pricing
Edit `_priceString` getter in `_ApplePackageCard`:
```dart
String get _priceString {
  if (package.packageType == PackageType.monthly) {
    return '\$4.99'; // Change here
  } else if (package.packageType == PackageType.annual) {
    return '\$45.99'; // Change here
  }
  return package.storeProduct.priceString;
}
```

### Change Free Trial Period
Update the text in `_ApplePackageCard`:
```dart
Text('14-day free trial', ...) // Change "14" to your trial period
```

### Change Features List
Edit `_buildFeaturesList()` in `PaywallScreen`:
```dart
final features = [
  ('Unlimited Swipes', Icons.swipe_outlined),
  ('Advanced Filters', Icons.tune_outlined),
  // Add more features here
];
```

---

## ✅ Checklist

- [x] Apple-style design implemented
- [x] Hard paywall (no close button)
- [x] Monthly: $4.99
- [x] Yearly: $45.99
- [x] 14-day free trial displayed for yearly
- [x] Brand colors (blue/green)
- [x] Clean, minimal UI
- [ ] Configure free trial in App Store Connect
- [ ] Configure free trial in Google Play Console
- [ ] Test with sandbox accounts

---

**Your hard paywall is ready!** 🎉

The paywall will automatically:
- Show correct pricing
- Display free trial for yearly plan
- Block access until subscription
- Handle purchases and restores
