import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/repository.dart';
import '../theme/app_theme.dart';
import 'premium_repo_card.dart';

/// Premium swipeable repo card with Apple-style gestures
class PremiumSwipeableCard extends StatefulWidget {
  final Repository repo;
  final VoidCallback? onLike;
  final VoidCallback? onSave;
  final VoidCallback? onSkip;
  final VoidCallback? onPreview;
  final VoidCallback? onSwipeComplete;

  const PremiumSwipeableCard({
    super.key,
    required this.repo,
    this.onLike,
    this.onSave,
    this.onSkip,
    this.onPreview,
    this.onSwipeComplete,
  });

  @override
  State<PremiumSwipeableCard> createState() => _PremiumSwipeableCardState();
}

class _PremiumSwipeableCardState extends State<PremiumSwipeableCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  double _dragOffsetX = 0.0;
  double _dragOffsetY = 0.0;
  bool _isDragging = false;
  SwipeDirection? _swipeDirection;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: AppTheme.animationNormal,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(
        parent: _controller,
        curve: AppTheme.springCurve,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handlePanUpdate(DragUpdateDetails details) {
    setState(() {
      _dragOffsetX += details.delta.dx;
      _dragOffsetY += details.delta.dy;
      _isDragging = true;
      
      // Determine swipe direction
      if (_dragOffsetX.abs() > _dragOffsetY.abs()) {
        _swipeDirection = _dragOffsetX > 0 
            ? SwipeDirection.right 
            : SwipeDirection.left;
      } else if (_dragOffsetY < 0 && _dragOffsetY.abs() > 50) {
        _swipeDirection = SwipeDirection.up;
      } else {
        _swipeDirection = null;
      }
    });
  }

  void _handlePanEnd(DragEndDetails details) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final velocity = details.velocity;
    
    const swipeThreshold = 100.0;
    const velocityThreshold = 500.0;
    
    final horizontalVelocity = velocity.pixelsPerSecond.dx;
    final verticalVelocity = velocity.pixelsPerSecond.dy;

    // Swipe right = Save
    if ((_dragOffsetX > swipeThreshold || horizontalVelocity > velocityThreshold) &&
        _dragOffsetX.abs() > _dragOffsetY.abs()) {
      HapticFeedback.mediumImpact();
      widget.onSave?.call();
      _animateOut();
    }
    // Swipe left = Skip
    else if ((_dragOffsetX < -swipeThreshold || horizontalVelocity < -velocityThreshold) &&
             _dragOffsetX.abs() > _dragOffsetY.abs()) {
      HapticFeedback.lightImpact();
      widget.onSkip?.call();
      _animateOut();
    }
    // Swipe up = Preview README
    else if ((_dragOffsetY < -swipeThreshold || verticalVelocity < -velocityThreshold) &&
             _dragOffsetY.abs() > _dragOffsetX.abs()) {
      HapticFeedback.selectionClick();
      widget.onPreview?.call();
      _resetPosition();
    }
    // Spring back
    else {
      _resetPosition();
    }
  }

  void _animateOut() {
    _controller.forward().then((_) {
      widget.onSwipeComplete?.call();
    });
  }

  void _resetPosition() {
    setState(() {
      _dragOffsetX = 0.0;
      _dragOffsetY = 0.0;
      _isDragging = false;
      _swipeDirection = null;
    });
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    
    // Calculate rotation and opacity based on drag
    final rotation = (_dragOffsetX / screenWidth) * 0.1;
    final opacity = 1.0 - (_dragOffsetX.abs() / screenWidth * 0.3).clamp(0.0, 0.3);
    final scale = _isDragging ? 0.98 : 1.0;

    // Swipe indicators
    final showSaveIndicator = _dragOffsetX > 50;
    final showSkipIndicator = _dragOffsetX < -50;
    final showPreviewIndicator = _dragOffsetY < -50;

    return Stack(
      children: [
        // Background card for depth
        if (!_isDragging)
          Positioned.fill(
            child: Transform.scale(
              scale: 0.96,
              child: Opacity(
                opacity: 0.2,
                child: PremiumRepoCard(repo: widget.repo),
              ),
            ),
          ),
        
        // Main card
        GestureDetector(
          onPanUpdate: _handlePanUpdate,
          onPanEnd: _handlePanEnd,
          child: Transform.translate(
            offset: Offset(_dragOffsetX, _dragOffsetY),
            child: Transform.scale(
              scale: scale * _scaleAnimation.value,
              child: Transform.rotate(
                angle: rotation,
                child: Opacity(
                  opacity: opacity,
                  child: PremiumRepoCard(
                    repo: widget.repo,
                    onSave: widget.onSave,
                    onPreview: widget.onPreview,
                  ),
                ),
              ),
            ),
          ),
        ),

        // Save indicator (right side)
        if (showSaveIndicator)
          Positioned(
            right: AppTheme.spacingMD,
            top: 0,
            bottom: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.spacingMD,
                  vertical: AppTheme.spacingSM,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  boxShadow: AppTheme.ambientShadow,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.bookmark,
                      color: AppTheme.textPrimary,
                      size: 20,
                    ),
                    const SizedBox(width: AppTheme.spacingXS),
                    Text(
                      'SAVE',
                      style: AppTheme.body.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

        // Skip indicator (left side)
        if (showSkipIndicator)
          Positioned(
            left: AppTheme.spacingMD,
            top: 0,
            bottom: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.spacingMD,
                  vertical: AppTheme.spacingSM,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.textSecondary.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  border: Border.all(
                    color: AppTheme.hairlineBorder,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.close,
                      color: AppTheme.textSecondary,
                      size: 20,
                    ),
                    const SizedBox(width: AppTheme.spacingXS),
                    Text(
                      'SKIP',
                      style: AppTheme.body.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

        // Preview indicator (top)
        if (showPreviewIndicator)
          Positioned(
            top: AppTheme.spacingMD,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.spacingMD,
                  vertical: AppTheme.spacingSM,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.elevatedSurface.withOpacity(0.95),
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  border: Border.all(
                    color: AppTheme.hairlineBorder,
                  ),
                  boxShadow: AppTheme.cardShadow,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.article_outlined,
                      color: AppTheme.accent,
                      size: 20,
                    ),
                    const SizedBox(width: AppTheme.spacingXS),
                    Text(
                      'PREVIEW README',
                      style: AppTheme.body.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppTheme.accent,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

enum SwipeDirection {
  left,
  right,
  up,
  down,
}
