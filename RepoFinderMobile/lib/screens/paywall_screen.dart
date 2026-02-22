import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/subscription_provider.dart';
import '../services/revenuecat_service.dart';
import '../theme/app_theme.dart';
import 'main_tab_screen.dart';

/// Check if running on a platform that doesn't support in-app purchases
bool get _isUnsupportedPlatform {
  try {
    // On mobile (iOS/Android), this will work fine
    return !(defaultTargetPlatform == TargetPlatform.iOS ||
             defaultTargetPlatform == TargetPlatform.android);
  } catch (_) {
    return true;
  }
}

/// Whether to show debug preview mode (unsupported platform + debug mode)
bool get _showDebugPreview => kDebugMode && _isUnsupportedPlatform;

/// Premium Paywall Screen - Apple-style, clean, minimal design
/// Layout: Logo → Title → Features → Plans → Button → Footer
/// Optimized to fit on one screen without scrolling
class PaywallScreen extends ConsumerStatefulWidget {
  final VoidCallback? onClose;
  final VoidCallback? onSubscribed;
  
  const PaywallScreen({
    super.key,
    this.onClose,
    this.onSubscribed,
  });

  @override
  ConsumerState<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends ConsumerState<PaywallScreen> 
    with SingleTickerProviderStateMixin {
  Package? _selectedPackage;
  String? _mockSelectedPlan; // For debug preview on desktop
  bool _isLoading = false;
  String? _error;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  // Feature points with aesthetic icons
  static const List<Map<String, dynamic>> _features = [
    {
      'title': 'Unlimited Swipes',
      'icon': Icons.swipe_rounded,
    },
    {
      'title': 'Personalized Recommendations',
      'icon': Icons.auto_awesome_rounded,
    },
    {
      'title': 'Smart Badges',
      'subtitle': 'Instantly identify perfect repos',
      'icon': Icons.verified_rounded,
    },
    {
      'title': 'Track History',
      'icon': Icons.history_rounded,
    },
    {
      'title': 'Early Access to Trending',
      'subtitle': 'Know before the world',
      'icon': Icons.trending_up_rounded,
    },
  ];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    );
    _animationController.forward();
    
    // Select yearly by default (has free trial)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_showDebugPreview) {
        // In debug preview, default to yearly
        setState(() {
          _mockSelectedPlan = 'yearly';
        });
      } else {
        final packages = ref.read(subscriptionProvider).availablePackages;
        if (packages.isNotEmpty) {
          setState(() {
            _selectedPackage = packages.firstWhere(
              (p) => p.packageType == PackageType.annual,
              orElse: () => packages.first,
            );
          });
        }
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _handlePurchase() async {
    if (_selectedPackage == null) return;
    
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    HapticFeedback.mediumImpact();
    
    try {
      final success = await ref.read(subscriptionProvider.notifier)
          .purchasePackage(_selectedPackage!);
      
      if (success) {
        HapticFeedback.heavyImpact();
        widget.onSubscribed?.call();
        if (mounted) {
          // If paywall was shown as a replacement (from splash), navigate to main app
          // Otherwise, just pop (if shown as modal from onboarding)
          final canPop = Navigator.of(context).canPop();
          if (canPop) {
            Navigator.of(context).pop(true);
          } else {
            // Navigate to main app if paywall was shown as replacement
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => const MainTabScreen(),
              ),
            );
          }
        }
      } else {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Purchase failed. Please try again.';
      });
    }
  }

  Future<void> _handleRestore() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      final success = await ref.read(subscriptionProvider.notifier)
          .restorePurchases();
      
      if (success) {
        HapticFeedback.heavyImpact();
        widget.onSubscribed?.call();
        if (mounted) {
          // If paywall was shown as a replacement (from splash), navigate to main app
          // Otherwise, just pop (if shown as modal from onboarding)
          final canPop = Navigator.of(context).canPop();
          if (canPop) {
            Navigator.of(context).pop(true);
          } else {
            // Navigate to main app if paywall was shown as replacement
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => const MainTabScreen(),
              ),
            );
          }
        }
      } else {
        setState(() {
          _isLoading = false;
          _error = 'No previous purchases found.';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Restore failed. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final subscription = ref.watch(subscriptionProvider);
    final packages = subscription.availablePackages;
    final screenHeight = MediaQuery.of(context).size.height;
    final isSmallScreen = screenHeight < 800;
    
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                padding: EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: isSmallScreen ? 8 : 16,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight,
                  ),
                  child: IntrinsicHeight(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Close button (top right) - optional for hard paywall
                        if (widget.onClose != null)
                          Align(
                            alignment: Alignment.topRight,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: IconButton(
                                icon: const Icon(
                                  Icons.close_rounded,
                                  color: AppTheme.textSecondary,
                                  size: 22,
                                ),
                                onPressed: widget.onClose,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                            ),
                          ),
                        
                        // Logo/Icon - smaller
                        _buildLogo(isSmallScreen),
                        SizedBox(height: isSmallScreen ? 16 : 20),
                        
                        // Title - smaller
                        _buildTitle(isSmallScreen),
                        SizedBox(height: isSmallScreen ? 20 : 24),
                        
                        // Feature Points - compact
                        _buildFeaturesList(isSmallScreen),
                        SizedBox(height: isSmallScreen ? 20 : 24),
                        
                        // Subscription Plans (at bottom)
                        if (packages.isNotEmpty) ...[
                          _buildPackageOptions(packages, isSmallScreen),
                          SizedBox(height: isSmallScreen ? 16 : 20),
                        ] else if (_showDebugPreview) ...[
                          // Debug preview: show mock plans on desktop
                          _buildDebugPreviewBanner(),
                          const SizedBox(height: 12),
                          _buildMockPackageOptions(isSmallScreen),
                          SizedBox(height: isSmallScreen ? 16 : 20),
                        ] else ...[
                          // Show configuration error if no packages
                          _buildConfigurationError(isSmallScreen),
                          SizedBox(height: isSmallScreen ? 16 : 20),
                        ],
                        
                        // Error message
                        if (_error != null) ...[
                          _buildErrorMessage(),
                          const SizedBox(height: 12),
                        ],
                        
                        // Continue Button - flexible height
                        _buildPurchaseButton(),
                        const SizedBox(height: 8),
                        
                        // Footer Links - compact
                        _buildLegalLinks(),
                        SizedBox(height: isSmallScreen ? 6 : 8),
                        
                        // Subscription Auto-Renewal Disclaimer
                        _buildAutoRenewalDisclaimer(isSmallScreen),
                        SizedBox(height: isSmallScreen ? 8 : 16),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildLogo(bool isSmallScreen) {
    final size = isSmallScreen ? 70.0 : 80.0;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.accent, AppTheme.success],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(size * 0.24),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accent.withOpacity(0.3),
            blurRadius: 20,
            spreadRadius: 0,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Icon(
        Icons.workspace_premium_rounded,
        color: Colors.white,
        size: size * 0.5,
      ),
    );
  }

  Widget _buildTitle(bool isSmallScreen) {
    return Text(
      'Pick your plan',
      style: TextStyle(
        fontSize: isSmallScreen ? 28 : 32,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.5,
        color: AppTheme.textPrimary,
        fontFamily: '.SF Pro Display', // Apple font fallback
        fontFeatures: const [
          FontFeature.tabularFigures(),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildFeaturesList(bool isSmallScreen) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: _features.map((feature) {
        return Padding(
          padding: EdgeInsets.only(bottom: isSmallScreen ? 12 : 14),
          child: _FeatureRow(
            title: feature['title'] as String,
            subtitle: feature['subtitle'] as String?,
            icon: feature['icon'] as IconData,
            isSmallScreen: isSmallScreen,
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPackageOptions(List<Package> packages, bool isSmallScreen) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: packages.map((package) {
        final isSelected = _selectedPackage?.identifier == package.identifier;
        final isYearly = package.packageType == PackageType.annual;
        
        return Padding(
          padding: EdgeInsets.only(bottom: isSmallScreen ? 8 : 10),
          child: _PackageCard(
            package: package,
            isSelected: isSelected,
            isYearly: isYearly,
            isSmallScreen: isSmallScreen,
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() {
                _selectedPackage = package;
              });
            },
          ),
        );
      }).toList(),
    );
  }

  Widget _buildErrorMessage() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AppTheme.error.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline, color: AppTheme.error, size: 18),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              _error!,
              style: TextStyle(
                color: AppTheme.error,
                fontSize: 13,
                fontFamily: '.SF Pro Text',
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  /// Debug purchase handler - simulates a successful purchase on desktop
  Future<void> _handleDebugPurchase() async {
    setState(() { _isLoading = true; });
    HapticFeedback.mediumImpact();
    
    // Simulate purchase delay
    await Future.delayed(const Duration(seconds: 2));
    
    setState(() { _isLoading = false; });
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            '🛒 DEBUG: Purchase simulated! On a real iOS device this would process through the App Store.',
          ),
          backgroundColor: AppTheme.accent,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  /// Debug preview banner - shows that this is a preview
  Widget _buildDebugPreviewBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: Colors.orange.withOpacity(0.4),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.desktop_windows_rounded, color: Colors.orange, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '🖥️ Desktop Preview Mode — real prices load on iOS/Android',
              style: TextStyle(
                color: Colors.orange.shade300,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Mock package options for debug preview on desktop
  Widget _buildMockPackageOptions(bool isSmallScreen) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Monthly plan
        Padding(
          padding: EdgeInsets.only(bottom: isSmallScreen ? 8 : 10),
          child: _MockPackageCard(
            planId: 'monthly',
            label: 'Month',
            price: '\$4.99',
            subtitle: 'Billed monthly',
            isSelected: _mockSelectedPlan == 'monthly',
            isYearly: false,
            isSmallScreen: isSmallScreen,
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() { _mockSelectedPlan = 'monthly'; });
            },
          ),
        ),
        // Yearly plan
        Padding(
          padding: EdgeInsets.only(bottom: isSmallScreen ? 8 : 10),
          child: _MockPackageCard(
            planId: 'yearly',
            label: 'Yearly',
            price: '\$39.99',
            subtitle: 'Only \$${(39.99 / 12).toStringAsFixed(2)}/mo',
            isSelected: _mockSelectedPlan == 'yearly',
            isYearly: true,
            isSmallScreen: isSmallScreen,
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() { _mockSelectedPlan = 'yearly'; });
            },
          ),
        ),
      ],
    );
  }

  Widget _buildConfigurationError(bool isSmallScreen) {
    return Container(
      padding: EdgeInsets.all(isSmallScreen ? 16 : 20),
      decoration: BoxDecoration(
        color: AppTheme.accent.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.accent.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.settings_outlined,
            color: AppTheme.accent,
            size: isSmallScreen ? 32 : 36,
          ),
          const SizedBox(height: 12),
          Text(
            'Subscription Setup Required',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: isSmallScreen ? 16 : 18,
              fontWeight: FontWeight.w600,
              fontFamily: '.SF Pro Display',
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Please complete RevenueCat configuration:\n'
            '1. Link products to App Store Connect\n'
            '2. Attach products to entitlement\n'
            '3. Add packages to offering',
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: isSmallScreen ? 12 : 13,
              fontFamily: '.SF Pro Text',
              height: 1.4,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildPurchaseButton() {
    final isYearly = _showDebugPreview 
        ? _mockSelectedPlan == 'yearly'
        : _selectedPackage?.packageType == PackageType.annual;
    final hasSelection = _showDebugPreview 
        ? _mockSelectedPlan != null 
        : _selectedPackage != null;
    
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _isLoading || !hasSelection
            ? null 
            : _showDebugPreview ? _handleDebugPurchase : _handlePurchase,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppTheme.accent.withOpacity(0.5),
          elevation: 0,
          padding: EdgeInsets.symmetric(
            horizontal: 20,
            vertical: isYearly ? 14 : 16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Colors.white,
                ),
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isYearly 
                        ? 'Start Free Trial'
                        : 'Continue',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.4,
                      fontFamily: '.SF Pro Display',
                    ),
                  ),
                  if (isYearly) ...[
                    const SizedBox(height: 3),
                    Text(
                      'Then \$39.99/year',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: Colors.white.withOpacity(0.85),
                        fontFamily: '.SF Pro Text',
                      ),
                    ),
                  ],
                ],
              ),
      ),
    );
  }

  Widget _buildLegalLinks() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        TextButton(
          onPressed: () => _openTerms(),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            'Terms',
            style: TextStyle(
              color: AppTheme.textSecondary.withOpacity(0.6),
              fontSize: 12,
              fontFamily: '.SF Pro Text',
            ),
          ),
        ),
        Text(
          ' • ',
          style: TextStyle(
            color: AppTheme.textSecondary.withOpacity(0.4),
            fontSize: 12,
          ),
        ),
        TextButton(
          onPressed: () => _openPrivacy(),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            'Privacy',
            style: TextStyle(
              color: AppTheme.textSecondary.withOpacity(0.6),
              fontSize: 12,
              fontFamily: '.SF Pro Text',
            ),
          ),
        ),
        Text(
          ' • ',
          style: TextStyle(
            color: AppTheme.textSecondary.withOpacity(0.4),
            fontSize: 12,
          ),
        ),
        TextButton(
          onPressed: _isLoading ? null : _handleRestore,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            'Restore',
            style: TextStyle(
              color: AppTheme.textSecondary.withOpacity(0.6),
              fontSize: 12,
              fontFamily: '.SF Pro Text',
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAutoRenewalDisclaimer(bool isSmallScreen) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: isSmallScreen ? 20 : 24),
      child: Text(
        'Subscription renews automatically unless cancelled at least 24 hours before the end of the period.',
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: isSmallScreen ? 10 : 11,
          color: AppTheme.textSecondary.withOpacity(0.6),
          fontFamily: '.SF Pro Text',
          height: 1.3,
        ),
      ),
    );
  }

  Future<void> _openTerms() async {
    const url = 'https://repoverse.space/terms';
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('Error opening terms: $e');
    }
  }

  Future<void> _openPrivacy() async {
    const url = 'https://repoverse.space/privacy';
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('Error opening privacy: $e');
    }
  }
}

/// Feature row with aesthetic icon (not just checkmark)
class _FeatureRow extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final bool isSmallScreen;

  const _FeatureRow({
    required this.title,
    this.subtitle,
    required this.icon,
    required this.isSmallScreen,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Aesthetic icon - black with subtle opacity, no background
        Icon(
          icon,
          color: AppTheme.textPrimary.withOpacity(0.7), // Visible but not fully contrast
          size: isSmallScreen ? 24 : 26,
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: isSmallScreen ? 15 : 16,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textPrimary,
                  fontFamily: '.SF Pro Text',
                  letterSpacing: -0.2,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 3),
                Text(
                  subtitle!,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                    fontFamily: '.SF Pro Text',
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// Package card - Apple-style with brand colors, compact
class _PackageCard extends StatelessWidget {
  final Package package;
  final bool isSelected;
  final bool isYearly;
  final bool isSmallScreen;
  final VoidCallback onTap;
  
  const _PackageCard({
    required this.package,
    required this.isSelected,
    required this.isYearly,
    required this.isSmallScreen,
    required this.onTap,
  });

  String get _periodLabel {
    switch (package.packageType) {
      case PackageType.monthly:
        return 'Month';
      case PackageType.annual:
        return 'Yearly';
      default:
        return package.identifier;
    }
  }

  String get _priceString {
    if (package.packageType == PackageType.monthly) {
      return '\$4.99';
    } else if (package.packageType == PackageType.annual) {
      return '\$39.99';
    }
    return package.storeProduct.priceString;
  }

  String get _monthlyPrice {
    if (package.packageType == PackageType.annual) {
      return 'Only \$${(39.99 / 12).toStringAsFixed(2)}/mo';
    }
    return '\$4.99/mo';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        padding: EdgeInsets.all(isSmallScreen ? 16 : 18),
        decoration: BoxDecoration(
          color: isSelected 
              ? AppTheme.accent.withOpacity(0.12)
              : AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected 
                ? AppTheme.accent 
                : AppTheme.divider,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Selection indicator
            Container(
              width: isSmallScreen ? 20 : 22,
              height: isSmallScreen ? 20 : 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected 
                      ? AppTheme.accent 
                      : AppTheme.textSecondary.withOpacity(0.3),
                  width: 2,
                ),
                color: isSelected 
                    ? AppTheme.accent 
                    : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(
                      Icons.check_rounded,
                      color: Colors.white,
                      size: 14,
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            
            // Plan details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Text(
                        _periodLabel,
                        style: TextStyle(
                          fontSize: isSmallScreen ? 16 : 17,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                          fontFamily: '.SF Pro Display',
                        ),
                      ),
                      if (isYearly) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.success,
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Text(
                            'BEST',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5,
                              fontFamily: '.SF Pro Text',
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (isYearly) ...[
                    Text(
                      _monthlyPrice,
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 12,
                        fontFamily: '.SF Pro Text',
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.success.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: AppTheme.success.withOpacity(0.25),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.star_rounded,
                            color: AppTheme.success,
                            size: 12,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '14-day free trial',
                            style: TextStyle(
                              color: AppTheme.success,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              fontFamily: '.SF Pro Text',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    Text(
                      'Billed monthly',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 12,
                        fontFamily: '.SF Pro Text',
                      ),
                    ),
                  ],
                ],
              ),
            ),
            
            // Price
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _priceString,
                  style: TextStyle(
                    fontSize: isSmallScreen ? 18 : 19,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                    fontFamily: '.SF Pro Display',
                  ),
                ),
                Text(
                  isYearly ? '/year' : '/mo',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                    fontFamily: '.SF Pro Text',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Helper function to show the paywall
Future<bool> showPaywallScreen(BuildContext context) async {
  final result = await Navigator.of(context).push<bool>(
    MaterialPageRoute(
      builder: (context) => const PaywallScreen(),
      fullscreenDialog: true,
    ),
  );
  
  return result ?? false;
}

/// Use RevenueCat's built-in paywall instead
Future<bool> showRevenueCatPaywall(BuildContext context) async {
  final service = RevenueCatService.instance;
  return await service.presentPaywall();
}

/// Mock package card for debug preview on unsupported platforms (Windows/Web/macOS)
/// Only visible in debug mode — production builds on iOS/Android use real RevenueCat data
class _MockPackageCard extends StatelessWidget {
  final String planId;
  final String label;
  final String price;
  final String subtitle;
  final bool isSelected;
  final bool isYearly;
  final bool isSmallScreen;
  final VoidCallback onTap;

  const _MockPackageCard({
    required this.planId,
    required this.label,
    required this.price,
    required this.subtitle,
    required this.isSelected,
    required this.isYearly,
    required this.isSmallScreen,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        padding: EdgeInsets.all(isSmallScreen ? 16 : 18),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.accent.withOpacity(0.12)
              : AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppTheme.accent : AppTheme.divider,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Selection indicator
            Container(
              width: isSmallScreen ? 20 : 22,
              height: isSmallScreen ? 20 : 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected
                      ? AppTheme.accent
                      : AppTheme.textSecondary.withOpacity(0.3),
                  width: 2,
                ),
                color: isSelected ? AppTheme.accent : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                  : null,
            ),
            const SizedBox(width: 12),
            // Plan details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: isSmallScreen ? 16 : 17,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                          fontFamily: '.SF Pro Display',
                        ),
                      ),
                      if (isYearly) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.success,
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: const Text(
                            'BEST',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 12,
                      fontFamily: '.SF Pro Text',
                    ),
                  ),
                  if (isYearly) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.success.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: AppTheme.success.withOpacity(0.25),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.star_rounded, color: AppTheme.success, size: 12),
                          const SizedBox(width: 4),
                          Text(
                            '14-day free trial',
                            style: TextStyle(
                              color: AppTheme.success,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              fontFamily: '.SF Pro Text',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            // Price
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  price,
                  style: TextStyle(
                    fontSize: isSmallScreen ? 18 : 19,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                    fontFamily: '.SF Pro Display',
                  ),
                ),
                Text(
                  isYearly ? '/year' : '/mo',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                    fontFamily: '.SF Pro Text',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
