import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/repository.dart';
import 'repo_card.dart';

class SwipeableRepoCard extends StatefulWidget {
  final Repository repo;
  final VoidCallback? onLike;
  final VoidCallback? onSave;
  final VoidCallback? onSkip;
  final VoidCallback? onSwipeComplete;

  const SwipeableRepoCard({
    super.key,
    required this.repo,
    this.onLike,
    this.onSave,
    this.onSkip,
    this.onSwipeComplete,
  });

  @override
  State<SwipeableRepoCard> createState() => _SwipeableRepoCardState();
}

class _SwipeableRepoCardState extends State<SwipeableRepoCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _rotationAnimation;
  late Animation<double> _scaleAnimation;
  double _dragOffset = 0.0;
  bool _isDragging = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _rotationAnimation = Tween<double>(begin: 0, end: 0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleDragUpdate(DragUpdateDetails details) {
    setState(() {
      _dragOffset += details.primaryDelta!;
      _isDragging = true;
    });
  }

  void _handleDragEnd(DragEndDetails details) {
    const swipeThreshold = 100.0;
    final velocity = details.primaryVelocity ?? 0;

    if (_dragOffset.abs() > swipeThreshold || velocity.abs() > 500) {
      // Swipe right = Like
      if (_dragOffset > 0 || velocity > 0) {
        HapticFeedback.mediumImpact();
        widget.onLike?.call();
        _animateOut(true);
      }
      // Swipe left = Skip
      else {
        HapticFeedback.lightImpact();
        widget.onSkip?.call();
        _animateOut(false);
      }
    } else {
      // Spring back
      _resetPosition();
    }
  }

  void _animateOut(bool isLike) {
    _controller.forward().then((_) {
      widget.onSwipeComplete?.call();
    });
  }

  void _resetPosition() {
    setState(() {
      _dragOffset = 0.0;
      _isDragging = false;
    });
    _controller.reset();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final rotation = (_dragOffset / screenWidth) * 0.1;
    final opacity = 1.0 - (_dragOffset.abs() / screenWidth * 0.5).clamp(0.0, 0.5);

    // Swipe indicators
    final showLikeIndicator = _dragOffset > 50;
    final showSkipIndicator = _dragOffset < -50;

    return Stack(
      children: [
        // Background cards for depth
        if (!_isDragging)
          Positioned.fill(
            child: Transform.scale(
              scale: 0.95,
              child: Opacity(
                opacity: 0.3,
                child: RepoCard(repo: widget.repo),
              ),
            ),
          ),
        
        // Main card
        GestureDetector(
          onHorizontalDragUpdate: _handleDragUpdate,
          onHorizontalDragEnd: _handleDragEnd,
          child: Transform.translate(
            offset: Offset(_dragOffset, 0),
            child: Transform.rotate(
              angle: rotation,
              child: Opacity(
                opacity: opacity,
                child: RepoCard(
                  repo: widget.repo,
                  onLike: widget.onLike,
                  onSave: widget.onSave,
                  onSkip: widget.onSkip,
                ),
              ),
            ),
          ),
        ),

        // Like indicator (right side)
        if (showLikeIndicator)
          Positioned(
            right: 20,
            top: 0,
            bottom: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'LIKE',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),

        // Skip indicator (left side)
        if (showSkipIndicator)
          Positioned(
            left: 20,
            top: 0,
            bottom: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'SKIP',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
