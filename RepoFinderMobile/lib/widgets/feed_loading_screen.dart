import 'dart:math';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum FeedLoadingMode { onboarding, batch }

class FeedLoadingScreen extends StatefulWidget {
  final FeedLoadingMode mode;

  const FeedLoadingScreen({
    super.key,
    this.mode = FeedLoadingMode.onboarding,
  });

  @override
  State<FeedLoadingScreen> createState() => _FeedLoadingScreenState();
}

class _FeedLoadingScreenState extends State<FeedLoadingScreen>
    with TickerProviderStateMixin {
  late final AnimationController _pulseCtrl;
  late final AnimationController _rotateCtrl;
  late final AnimationController _orbCtrl;
  late final AnimationController _dotCtrl;
  late final AnimationController _msgCtrl;

  late final Animation<double> _pulseAnim;
  late final Animation<double> _msgFadeAnim;

  int _msgIndex = 0;

  // (title, subtitle)
  static const _onboardingMessages = [
    ('Building your\npersonal feed', 'Scanning 22,800+ repositories for you'),
    ('Matching your\ntech stack', 'Finding repos in your favorite languages'),
    ('Ranking your\nbest matches', 'Scoring by relevance, quality & freshness'),
    ('Almost ready', 'Your personalized feed is almost complete'),
  ];

  static const _batchMessages = [
    ('Oh, you have\ngreat taste!', 'Let me find more gems for you'),
    ('Nice picks\nso far', 'Loading your next set of repos'),
    ('Keep exploring', 'Curating more repos just for you'),
    ('Finding more\nfor you', 'Almost ready with the next batch'),
  ];

  List<(String, String)> get _messages => widget.mode == FeedLoadingMode.onboarding
      ? _onboardingMessages
      : _batchMessages;

  @override
  void initState() {
    super.initState();

    _pulseCtrl = AnimationController(
      duration: const Duration(milliseconds: 1800),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.88, end: 1.12).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );

    _rotateCtrl = AnimationController(
      duration: const Duration(seconds: 6),
      vsync: this,
    )..repeat();

    _orbCtrl = AnimationController(
      duration: const Duration(seconds: 5),
      vsync: this,
    )..repeat(reverse: true);

    _dotCtrl = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat();

    _msgCtrl = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    )..value = 1.0;
    _msgFadeAnim = CurvedAnimation(parent: _msgCtrl, curve: Curves.easeInOut);

    _cycleMsgs();
  }

  Future<void> _cycleMsgs() async {
    while (mounted) {
      await Future.delayed(const Duration(milliseconds: 2400));
      if (!mounted) return;
      await _msgCtrl.reverse();
      if (!mounted) return;
      setState(() => _msgIndex = (_msgIndex + 1) % _messages.length);
      await _msgCtrl.forward();
    }
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _rotateCtrl.dispose();
    _orbCtrl.dispose();
    _dotCtrl.dispose();
    _msgCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final msg = _messages[_msgIndex];

    return Container(
      color: AppTheme.background,
      child: Stack(
        children: [
          // ── Floating background orbs ─────────────────────────────────────
          AnimatedBuilder(
            animation: _orbCtrl,
            builder: (_, __) {
              final t = _orbCtrl.value;
              return Stack(
                children: [
                  Positioned(
                    top: -100 + 30 * t,
                    right: -80 + 15 * sin(t * pi),
                    child: _blurOrb(220, const Color(0x1E0A84FF)),
                  ),
                  Positioned(
                    bottom: 60 + 20 * t,
                    left: -80 + 10 * cos(t * pi),
                    child: _blurOrb(180, const Color(0x140A84FF)),
                  ),
                  Positioned(
                    top: size.height * 0.38 + 12 * t,
                    right: 20 + 6 * t,
                    child: _blurOrb(70, const Color(0x190A84FF)),
                  ),
                ],
              );
            },
          ),

          // ── Main content ─────────────────────────────────────────────────
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildCenterIcon(),
                  const SizedBox(height: 52),
                  FadeTransition(
                    opacity: _msgFadeAnim,
                    child: Column(
                      children: [
                        Text(
                          msg.$1,
                          style: const TextStyle(
                            fontFamily: AppTheme.fontFamily,
                            fontSize: 30,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                            letterSpacing: -0.8,
                            height: 1.15,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          msg.$2,
                          style: const TextStyle(
                            fontFamily: AppTheme.fontFamily,
                            fontSize: 15,
                            fontWeight: FontWeight.w400,
                            color: AppTheme.textSecondary,
                            height: 1.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 52),
                  _buildProgressDots(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _blurOrb(double size, Color color) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, Colors.transparent],
        ),
      ),
    );
  }

  Widget _buildCenterIcon() {
    return AnimatedBuilder(
      animation: Listenable.merge([_pulseCtrl, _rotateCtrl]),
      builder: (_, __) {
        return SizedBox(
          width: 130,
          height: 130,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Outer rotating dashed ring
              Transform.rotate(
                angle: _rotateCtrl.value * 2 * pi,
                child: CustomPaint(
                  size: const Size(118, 118),
                  painter: _DashedRingPainter(
                    color: const Color(0x4D0A84FF), // accent @ 30%
                    strokeWidth: 1.5,
                    dashCount: 12,
                  ),
                ),
              ),

              // Outer pulse glow
              Container(
                width: 96 * _pulseAnim.value,
                height: 96 * _pulseAnim.value,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0x150A84FF),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),

              // Inner circle with icon
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF0A1628),
                  border: Border.all(
                    color: const Color(0x660A84FF), // accent @ 40%
                    width: 1.5,
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x400A84FF),
                      blurRadius: 28,
                      spreadRadius: 6,
                    ),
                  ],
                ),
                child: const Icon(
                  CupertinoIcons.sparkles,
                  color: AppTheme.accent,
                  size: 30,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProgressDots() {
    return AnimatedBuilder(
      animation: _dotCtrl,
      builder: (_, __) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(3, (i) {
            final phase = i / 3.0;
            final raw = (_dotCtrl.value + phase) % 1.0;
            final t = raw < 0.5 ? raw * 2 : 2 - raw * 2;
            final opacity = 0.25 + 0.75 * Curves.easeInOut.transform(t.clamp(0.0, 1.0));
            final scale = 0.65 + 0.35 * Curves.easeInOut.transform(t.clamp(0.0, 1.0));
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5),
              child: Transform.scale(
                scale: scale,
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color.fromRGBO(10, 132, 255, opacity),
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

// ─── Dashed ring painter ─────────────────────────────────────────────────────
class _DashedRingPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final int dashCount;

  const _DashedRingPainter({
    required this.color,
    required this.strokeWidth,
    required this.dashCount,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - strokeWidth / 2;
    final dashAngle = (2 * pi) / (dashCount * 2);

    for (int i = 0; i < dashCount; i++) {
      final startAngle = i * 2 * dashAngle;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        dashAngle,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_DashedRingPainter old) =>
      old.color != color || old.strokeWidth != strokeWidth || old.dashCount != dashCount;
}
