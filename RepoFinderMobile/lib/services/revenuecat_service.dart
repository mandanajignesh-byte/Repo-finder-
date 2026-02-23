import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// RevenueCat configuration constants
class RevenueCatConfig {
  // Your RevenueCat API key
  static const String apiKey = 'test_AicJXufprKBUEFVnpevpTRDgDfq';
  
  // Entitlement identifier (configured in RevenueCat dashboard)
  static const String entitlementId = 'Repoverse Pro';
  
  // Product identifiers (configured in App Store Connect / Google Play Console)
  static const String monthlyProductId = 'monthly';
  static const String yearlyProductId = 'yearly';
  
  // Offering identifier (default offering)
  static const String defaultOfferingId = 'default';

  /// VIP emails that always get Pro access (for testing + Apple review)
  /// These users bypass the paywall completely — no purchase needed.
  static const List<String> vipEmails = [
    'mandanajignesh@gmail.com',
    // Add more test emails here if needed
  ];
}

/// Subscription status enum for easier handling
enum SubscriptionStatus {
  notSubscribed,
  subscribed,
  expired,
  inGracePeriod,
  inBillingRetry,
  paused,
}

/// RevenueCat Service - Handles all subscription-related operations
class RevenueCatService extends ChangeNotifier {
  static RevenueCatService? _instance;
  
  // Subscription state
  bool _isProUser = false;
  CustomerInfo? _customerInfo;
  Offerings? _offerings;
  bool _isInitialized = false;
  String? _userId;
  SubscriptionStatus _subscriptionStatus = SubscriptionStatus.notSubscribed;
  
  // Stream controller for subscription changes
  final StreamController<bool> _subscriptionStreamController = 
      StreamController<bool>.broadcast();
  
  // Getters
  /// Returns true if user has Pro access via subscription OR is a VIP email
  bool get isProUser {
    if (_isProUser) return true;
    // Check VIP email bypass
    return _isVipUser;
  }

  /// Check if current Supabase user's email is in the VIP list
  bool get _isVipUser {
    try {
      final email = Supabase.instance.client.auth.currentUser?.email;
      if (email == null) return false;
      return RevenueCatConfig.vipEmails.contains(email.toLowerCase());
    } catch (_) {
      return false;
    }
  }
  CustomerInfo? get customerInfo => _customerInfo;
  Offerings? get offerings => _offerings;
  bool get isInitialized => _isInitialized;
  String? get userId => _userId;
  SubscriptionStatus get subscriptionStatus => _subscriptionStatus;
  Stream<bool> get subscriptionStream => _subscriptionStreamController.stream;
  
  /// Get singleton instance
  static RevenueCatService get instance {
    _instance ??= RevenueCatService._internal();
    return _instance!;
  }
  
  RevenueCatService._internal();
  
  /// Initialize RevenueCat SDK
  /// Call this in main() before runApp()
  Future<void> initialize({String? appUserId}) async {
    if (_isInitialized) {
      debugPrint('🔐 RevenueCat already initialized');
      return;
    }
    
    try {
      debugPrint('🔐 Initializing RevenueCat...');
      
      // Configure RevenueCat
      final configuration = PurchasesConfiguration(RevenueCatConfig.apiKey);
      
      // Set app user ID if provided (for syncing with your backend)
      if (appUserId != null && appUserId.isNotEmpty) {
        configuration.appUserID = appUserId;
        _userId = appUserId;
      }
      
      // Enable debug logs in development
      if (kDebugMode) {
        await Purchases.setLogLevel(LogLevel.debug);
      }
      
      // Initialize the SDK
      await Purchases.configure(configuration);
      
      // Set up listener for customer info updates
      Purchases.addCustomerInfoUpdateListener(_onCustomerInfoUpdate);
      
      // Fetch initial customer info and offerings
      await _refreshCustomerInfo();
      await _fetchOfferings();
      
      _isInitialized = true;
      debugPrint('✅ RevenueCat initialized successfully');
      debugPrint('   Pro user: $_isProUser');
      debugPrint('   User ID: ${_customerInfo?.originalAppUserId}');
      
      notifyListeners();
    } catch (e) {
      debugPrint('❌ RevenueCat initialization failed: $e');
      // Don't throw - app should work without subscriptions
      _isInitialized = false;
    }
  }
  
  /// Listener for customer info updates (purchases, restores, etc.)
  void _onCustomerInfoUpdate(CustomerInfo info) {
    debugPrint('🔔 Customer info updated');
    _updateCustomerInfo(info);
  }
  
  /// Update internal state from customer info
  void _updateCustomerInfo(CustomerInfo info) {
    _customerInfo = info;
    
    // Check if user has the Pro entitlement
    final entitlement = info.entitlements.all[RevenueCatConfig.entitlementId];
    final wasProUser = _isProUser;
    
    if (entitlement != null && entitlement.isActive) {
      _isProUser = true;
      
      // Determine subscription status
      if (entitlement.willRenew) {
        _subscriptionStatus = SubscriptionStatus.subscribed;
      } else if (entitlement.periodType == PeriodType.trial) {
        // Check if in grace period via other means
        _subscriptionStatus = SubscriptionStatus.inGracePeriod;
      } else {
        // Active but not renewing = will expire
        _subscriptionStatus = SubscriptionStatus.subscribed;
      }
    } else {
      _isProUser = false;
      _subscriptionStatus = SubscriptionStatus.notSubscribed;
    }
    
    // Emit subscription change if status changed
    if (wasProUser != _isProUser) {
      _subscriptionStreamController.add(_isProUser);
    }
    
    debugPrint('🔐 Subscription status: $_subscriptionStatus');
    debugPrint('🔐 Is Pro: $_isProUser');
    
    notifyListeners();
  }
  
  /// Refresh customer info from RevenueCat
  Future<void> _refreshCustomerInfo() async {
    try {
      final info = await Purchases.getCustomerInfo();
      _updateCustomerInfo(info);
    } catch (e) {
      debugPrint('❌ Failed to get customer info: $e');
    }
  }
  
  /// Fetch available offerings
  Future<void> _fetchOfferings() async {
    try {
      _offerings = await Purchases.getOfferings();
      debugPrint('📦 Loaded ${_offerings?.all.length ?? 0} offerings');
      
      if (_offerings?.current != null) {
        debugPrint('   Current offering: ${_offerings!.current!.identifier}');
        debugPrint('   Packages: ${_offerings!.current!.availablePackages.length}');
        
        // Warn if no packages available
        if (_offerings!.current!.availablePackages.isEmpty) {
          debugPrint('⚠️ WARNING: No packages found in offering. RevenueCat configuration incomplete.');
          debugPrint('   Please ensure:');
          debugPrint('   1. Products (monthly, yearly) are created in RevenueCat');
          debugPrint('   2. Products are linked to App Store Connect');
          debugPrint('   3. Products are attached to "Repoverse Pro" entitlement');
          debugPrint('   4. Offering "default" has packages added');
        }
      } else {
        debugPrint('⚠️ WARNING: No current offering found. Check RevenueCat dashboard configuration.');
      }
      
      notifyListeners();
    } catch (e) {
      debugPrint('❌ Failed to fetch offerings: $e');
      debugPrint('   This usually means RevenueCat dashboard is not fully configured.');
      debugPrint('   Error details: ${e.toString()}');
      // Don't set offerings to null - keep previous state if available
    }
  }
  
  /// Get the current (default) offering
  Offering? get currentOffering => _offerings?.current;
  
  /// Get available packages from the current offering
  List<Package> get availablePackages {
    return _offerings?.current?.availablePackages ?? [];
  }
  
  /// Get monthly package
  Package? get monthlyPackage {
    return _offerings?.current?.monthly;
  }
  
  /// Get yearly package
  Package? get yearlyPackage {
    return _offerings?.current?.annual;
  }
  
  /// Purchase a package
  Future<bool> purchasePackage(Package package) async {
    try {
      debugPrint('💳 Purchasing package: ${package.identifier}');
      
      final customerInfo = await Purchases.purchasePackage(package);
      _updateCustomerInfo(customerInfo);
      
      if (_isProUser) {
        debugPrint('✅ Purchase successful!');
        return true;
      } else {
        debugPrint('⚠️ Purchase completed but entitlement not active');
        return false;
      }
    } on PurchasesErrorCode catch (e) {
      debugPrint('❌ Purchase error: $e');
      _handlePurchaseError(e);
      return false;
    } catch (e) {
      debugPrint('❌ Purchase failed: $e');
      return false;
    }
  }
  
  /// Purchase a specific product by ID
  Future<bool> purchaseProduct(String productId) async {
    try {
      final storeProduct = await _getStoreProduct(productId);
      if (storeProduct == null) {
        debugPrint('❌ Product not found: $productId');
        return false;
      }
      
      final customerInfo = await Purchases.purchaseStoreProduct(storeProduct);
      _updateCustomerInfo(customerInfo);
      
      return _isProUser;
    } catch (e) {
      debugPrint('❌ Purchase product failed: $e');
      return false;
    }
  }
  
  /// Get store product by ID
  Future<StoreProduct?> _getStoreProduct(String productId) async {
    try {
      final products = await Purchases.getProducts([productId]);
      return products.firstOrNull;
    } catch (e) {
      debugPrint('❌ Failed to get product: $e');
      return null;
    }
  }
  
  /// Restore purchases
  Future<bool> restorePurchases() async {
    try {
      debugPrint('🔄 Restoring purchases...');
      
      final customerInfo = await Purchases.restorePurchases();
      _updateCustomerInfo(customerInfo);
      
      if (_isProUser) {
        debugPrint('✅ Purchases restored successfully!');
        return true;
      } else {
        debugPrint('ℹ️ No purchases to restore');
        return false;
      }
    } catch (e) {
      debugPrint('❌ Restore failed: $e');
      return false;
    }
  }
  
  /// Present the RevenueCat Paywall
  /// Returns true if user subscribed, false otherwise
  Future<bool> presentPaywall() async {
    try {
      debugPrint('💳 Presenting paywall...');
      
      await RevenueCatUI.presentPaywall();
      
      debugPrint('💳 Paywall closed');
      
      // Refresh customer info after paywall closes
      await _refreshCustomerInfo();
      
      // Return true if user is now Pro
      return _isProUser;
    } catch (e) {
      debugPrint('❌ Paywall error: $e');
      return false;
    }
  }
  
  /// Present paywall if user is not subscribed
  /// Returns true if user is Pro (either already or just subscribed)
  Future<bool> presentPaywallIfNeeded() async {
    if (_isProUser) {
      return true;
    }
    
    final subscribed = await presentPaywall();
    return subscribed;
  }
  
  /// Present Customer Center for managing subscription
  Future<void> presentCustomerCenter() async {
    try {
      debugPrint('👤 Presenting Customer Center...');
      await RevenueCatUI.presentCustomerCenter();
      
      // Refresh after customer center closes
      await _refreshCustomerInfo();
    } catch (e) {
      debugPrint('❌ Customer Center error: $e');
    }
  }
  
  /// Log in a user (for syncing with your backend)
  Future<void> logIn(String appUserId) async {
    try {
      debugPrint('🔐 Logging in user: $appUserId');
      
      final result = await Purchases.logIn(appUserId);
      _userId = appUserId;
      _updateCustomerInfo(result.customerInfo);
      
      debugPrint('✅ User logged in');
    } catch (e) {
      debugPrint('❌ Login failed: $e');
    }
  }
  
  /// Log out user (switch to anonymous)
  Future<void> logOut() async {
    try {
      debugPrint('🔐 Logging out user...');
      
      final info = await Purchases.logOut();
      _userId = null;
      _updateCustomerInfo(info);
      
      debugPrint('✅ User logged out');
    } catch (e) {
      debugPrint('❌ Logout failed: $e');
    }
  }
  
  /// Check if a specific entitlement is active
  bool hasEntitlement(String entitlementId) {
    final entitlement = _customerInfo?.entitlements.all[entitlementId];
    return entitlement?.isActive ?? false;
  }
  
  /// Get active subscription's expiration date
  DateTime? get expirationDate {
    final entitlement = _customerInfo?.entitlements.all[RevenueCatConfig.entitlementId];
    if (entitlement?.expirationDate != null) {
      return DateTime.parse(entitlement!.expirationDate!);
    }
    return null;
  }
  
  /// Get management URL for subscription
  String? get managementUrl {
    return _customerInfo?.managementURL;
  }
  
  /// Handle purchase errors
  void _handlePurchaseError(PurchasesErrorCode errorCode) {
    switch (errorCode) {
      case PurchasesErrorCode.purchaseCancelledError:
        debugPrint('ℹ️ Purchase was cancelled by user');
        break;
      case PurchasesErrorCode.purchaseNotAllowedError:
        debugPrint('⚠️ Purchase not allowed on this device');
        break;
      case PurchasesErrorCode.purchaseInvalidError:
        debugPrint('⚠️ Invalid purchase');
        break;
      case PurchasesErrorCode.productNotAvailableForPurchaseError:
        debugPrint('⚠️ Product not available for purchase');
        break;
      case PurchasesErrorCode.networkError:
        debugPrint('⚠️ Network error during purchase');
        break;
      default:
        debugPrint('⚠️ Purchase error: $errorCode');
    }
  }
  
  /// Sync purchases with RevenueCat (useful after app reinstall)
  Future<void> syncPurchases() async {
    try {
      if (Platform.isAndroid) {
        await Purchases.syncPurchases();
      }
      await _refreshCustomerInfo();
    } catch (e) {
      debugPrint('❌ Sync purchases failed: $e');
    }
  }
  
  /// Get formatted price string for a package
  String getPriceString(Package package) {
    return package.storeProduct.priceString;
  }
  
  /// Get subscription period string
  String getSubscriptionPeriod(Package package) {
    switch (package.packageType) {
      case PackageType.monthly:
        return 'month';
      case PackageType.annual:
        return 'year';
      case PackageType.weekly:
        return 'week';
      case PackageType.lifetime:
        return 'lifetime';
      default:
        return 'period';
    }
  }
  
  /// Dispose resources
  @override
  void dispose() {
    _subscriptionStreamController.close();
    super.dispose();
  }
}
