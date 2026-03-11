# RevenueCat Paywall Integration Guide

## ✅ Your Code-Based Paywall is Ready!

You have a **fully functional custom paywall** implemented in code. You can **skip the visual editor** in RevenueCat dashboard and use your custom UI instead.

---

## 📁 Files Created

1. **`lib/screens/paywall_screen.dart`** - Your beautiful custom paywall UI
2. **`lib/services/revenuecat_service.dart`** - RevenueCat SDK integration
3. **`lib/providers/subscription_provider.dart`** - State management
4. **`lib/widgets/premium_gate.dart`** - Premium feature gates
5. **`lib/utils/paywall_helper.dart`** - Helper functions for common scenarios

---

## 🚀 How to Use Your Paywall

### Basic Usage

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:repofinder_mobile/screens/paywall_screen.dart';

// Show paywall anywhere in your app
final subscribed = await showPaywallScreen(context);

if (subscribed) {
  // User subscribed! Show premium features
}
```

### Check if User is Pro

```dart
import 'package:repofinder_mobile/providers/subscription_provider.dart';

// In a ConsumerWidget
final isPro = ref.watch(isProUserProvider);

if (isPro) {
  // Show premium content
} else {
  // Show upgrade button
}
```

### Gate Premium Features

```dart
import 'package:repofinder_mobile/widgets/premium_gate.dart';

// Wrap premium content
PremiumGate(
  featureName: 'Advanced Filters',
  child: AdvancedFiltersWidget(),
)
```

### Limit Free Users

```dart
import 'package:repofinder_mobile/utils/paywall_helper.dart';

// After 50 swipes, show paywall
PaywallHelper.checkSwipeLimit(context, ref, swipeCount);

// Limit saves to 10 for free users
final canSave = await PaywallHelper.checkSaveLimit(
  context,
  ref,
  savedRepos.length,
);
```

---

## 🎯 Common Use Cases

### 1. Show Paywall After X Swipes

```dart
// In discovery_screen.dart
void _onCardSwiped(...) {
  _totalSeenCount++;
  
  // Free users get 50 swipes
  if (_totalSeenCount >= 50) {
    final isPro = ref.read(isProUserProvider);
    if (!isPro) {
      showPaywallScreen(context);
    }
  }
}
```

### 2. Limit Saves for Free Users

```dart
Future<void> _handleSave(Repository repo) async {
  final isPro = ref.read(isProUserProvider);
  final savedCount = savedRepos.length;
  
  if (!isPro && savedCount >= 10) {
    final subscribed = await showPaywallScreen(context);
    if (!subscribed) return; // Don't save if not subscribed
  }
  
  // Save the repo
  await repoService.saveRepo(userId, repo);
}
```

### 3. Show Upgrade Button

```dart
import 'package:repofinder_mobile/widgets/premium_gate.dart';

// Shows only for non-Pro users
UpgradeButton()  // Full button
UpgradeButton(compact: true)  // Icon only
```

### 4. Premium Badge

```dart
// Shows PRO badge for Pro users
PremiumBadge()
```

---

## 📋 RevenueCat Dashboard Setup

**You can skip the visual paywall editor!** Just mark it as done and focus on:

### Required Steps:

1. ✅ **Products** → Create:
   - `monthly` (Monthly subscription)
   - `yearly` (Yearly subscription)

2. ✅ **Entitlements** → Create:
   - `Repoverse Pro` (Link both products to this)

3. ✅ **Offerings** → Create:
   - `default` offering
   - Add Monthly package (links to `monthly` product)
   - Add Annual package (links to `yearly` product)

4. ✅ **App Store Connect / Google Play**:
   - Create in-app purchase products
   - Use same IDs: `monthly`, `yearly`

---

## 🧪 Testing

### Sandbox Testing

1. Use **sandbox test accounts** on iOS/Android
2. RevenueCat will simulate purchases
3. Check subscription status in your app

### Test Purchase Flow

```dart
// Your paywall automatically handles:
// - Package selection
// - Purchase flow
// - Error handling
// - Restore purchases
// - Subscription status updates
```

---

## 🎨 Customization

### Change Paywall Design

Edit `lib/screens/paywall_screen.dart`:
- Modify `_buildFeaturesList()` to change features
- Update colors in `_buildProBadge()`
- Customize package cards in `_PackageCard`

### Change Free Limits

Edit `lib/utils/paywall_helper.dart`:
```dart
const freeSwipeLimit = 50;  // Change this
const freeSaveLimit = 10;    // Change this
```

---

## 📱 Integration Examples

### Example 1: Discovery Screen

```dart
// Add to discovery_screen.dart
import 'package:repofinder_mobile/utils/paywall_helper.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  void _onCardSwiped(...) {
    _totalSeenCount++;
    
    // Check limit for free users
    PaywallHelper.checkSwipeLimit(context, ref, _totalSeenCount);
  }
}
```

### Example 2: Save Button

```dart
Future<void> _handleSave(Repository repo) async {
  final canSave = await PaywallHelper.checkSaveLimit(
    context,
    ref,
    savedRepos.length,
  );
  
  if (!canSave) return;
  
  // Save repo
}
```

### Example 3: Premium Feature

```dart
// Wrap premium feature
PremiumGate(
  featureName: 'Advanced Filters',
  child: AdvancedFiltersWidget(),
)
```

---

## 🔧 Troubleshooting

### Paywall Not Showing

1. Check RevenueCat initialization in `main.dart`
2. Verify API key is correct
3. Ensure offerings are configured in dashboard

### Products Not Loading

1. Check product IDs match dashboard (`monthly`, `yearly`)
2. Verify offerings are published
3. Check network connection

### Subscription Not Activating

1. Verify entitlement ID: `Repoverse Pro`
2. Check products are linked to entitlement
3. Test with sandbox account

---

## 📚 Next Steps

1. ✅ **Mark "Create paywall" as done** in RevenueCat dashboard
2. ✅ **Create Products** (`monthly`, `yearly`)
3. ✅ **Create Entitlement** (`Repoverse Pro`)
4. ✅ **Create Offering** (`default`)
5. ✅ **Set up App Store / Play Store** products
6. ✅ **Test with sandbox accounts**

---

## 💡 Pro Tips

- Your custom paywall is **more flexible** than the visual editor
- You can **A/B test** different designs easily
- **Premium gates** make it easy to protect features
- Use **PaywallHelper** for common scenarios

---

**Your paywall is ready to use!** 🎉
