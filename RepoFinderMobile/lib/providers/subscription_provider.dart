import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import '../services/revenuecat_service.dart';

/// State class for subscription
class SubscriptionState {
  final bool isProUser;
  final bool isLoading;
  final String? error;
  final CustomerInfo? customerInfo;
  final Offerings? offerings;
  final SubscriptionStatus status;
  
  const SubscriptionState({
    this.isProUser = false,
    this.isLoading = true,
    this.error,
    this.customerInfo,
    this.offerings,
    this.status = SubscriptionStatus.notSubscribed,
  });
  
  SubscriptionState copyWith({
    bool? isProUser,
    bool? isLoading,
    String? error,
    CustomerInfo? customerInfo,
    Offerings? offerings,
    SubscriptionStatus? status,
    bool clearError = false,
  }) {
    return SubscriptionState(
      isProUser: isProUser ?? this.isProUser,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      customerInfo: customerInfo ?? this.customerInfo,
      offerings: offerings ?? this.offerings,
      status: status ?? this.status,
    );
  }
  
  /// Check if user can access premium features
  bool get canAccessPremium => isProUser;
  
  /// Get monthly package
  Package? get monthlyPackage => offerings?.current?.monthly;
  
  /// Get yearly package
  Package? get yearlyPackage => offerings?.current?.annual;
  
  /// Get all available packages
  List<Package> get availablePackages => 
      offerings?.current?.availablePackages ?? [];
  
  /// Get expiration date string
  String? get expirationDateFormatted {
    final entitlement = customerInfo?.entitlements.all[RevenueCatConfig.entitlementId];
    return entitlement?.expirationDate;
  }
}

/// Subscription notifier for managing subscription state
class SubscriptionNotifier extends StateNotifier<SubscriptionState> {
  final RevenueCatService _service;
  
  SubscriptionNotifier(this._service) : super(const SubscriptionState()) {
    _init();
    _service.addListener(_onServiceUpdate);
  }
  
  void _init() {
    _syncWithService();
  }
  
  void _onServiceUpdate() {
    _syncWithService();
  }
  
  void _syncWithService() {
    state = state.copyWith(
      isProUser: _service.isProUser,
      isLoading: !_service.isInitialized,
      customerInfo: _service.customerInfo,
      offerings: _service.offerings,
      status: _service.subscriptionStatus,
      clearError: true,
    );
  }
  
  /// Purchase a package
  Future<bool> purchasePackage(Package package) async {
    state = state.copyWith(isLoading: true, clearError: true);
    
    try {
      final success = await _service.purchasePackage(package);
      _syncWithService();
      return success;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }
  
  /// Restore purchases
  Future<bool> restorePurchases() async {
    state = state.copyWith(isLoading: true, clearError: true);
    
    try {
      final success = await _service.restorePurchases();
      _syncWithService();
      return success;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }
  
  /// Present paywall
  Future<bool> presentPaywall() async {
    try {
      final subscribed = await _service.presentPaywall();
      _syncWithService();
      return subscribed;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
  
  /// Present customer center
  Future<void> presentCustomerCenter() async {
    try {
      await _service.presentCustomerCenter();
      _syncWithService();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
  
  @override
  void dispose() {
    _service.removeListener(_onServiceUpdate);
    super.dispose();
  }
}

/// RevenueCat service provider
final revenueCatServiceProvider = Provider<RevenueCatService>((ref) {
  return RevenueCatService.instance;
});

/// Subscription state provider
final subscriptionProvider = 
    StateNotifierProvider<SubscriptionNotifier, SubscriptionState>((ref) {
  final service = ref.watch(revenueCatServiceProvider);
  return SubscriptionNotifier(service);
});

/// Simple boolean provider for quick pro status checks
final isProUserProvider = Provider<bool>((ref) {
  return ref.watch(subscriptionProvider).isProUser;
});

/// Provider for available packages
final availablePackagesProvider = Provider<List<Package>>((ref) {
  return ref.watch(subscriptionProvider).availablePackages;
});
