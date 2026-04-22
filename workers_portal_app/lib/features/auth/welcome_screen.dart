import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'login_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with TickerProviderStateMixin {
  late final AnimationController _particleCtrl;
  late final AnimationController _fadeCtrl;
  late final AnimationController _slideCtrl;
  late final AnimationController _pulseCtrl;

  late final Animation<double> _fadeIn;
  late final Animation<Offset> _slideUp;
  late final Animation<double> _pulse;

  @override
  void initState() {
    super.initState();

    _particleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat();

    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _slideCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );

    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _fadeIn = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _slideUp = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _slideCtrl, curve: Curves.easeOutCubic));
    _pulse = Tween<double>(begin: 0.95, end: 1.05)
        .animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));

    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) {
        _fadeCtrl.forward();
        _slideCtrl.forward();
      }
    });
  }

  @override
  void dispose() {
    _particleCtrl.dispose();
    _fadeCtrl.dispose();
    _slideCtrl.dispose();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        children: [
          // Animated gradient background
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF0F172A),
                  Color(0xFF1E3A8A),
                  Color(0xFF1E1B4B),
                ],
                stops: [0.0, 0.5, 1.0],
              ),
            ),
          ),

          // Animated particles
          AnimatedBuilder(
            animation: _particleCtrl,
            builder: (_, __) => CustomPaint(
              size: size,
              painter: _ParticlePainter(_particleCtrl.value),
            ),
          ),

          // Glow orbs
          Positioned(
            top: -100,
            right: -80,
            child: _GlowOrb(
              size: 320,
              color: const Color(0xFF3B82F6).withValues(alpha: 0.15),
            ),
          ),
          Positioned(
            bottom: 80,
            left: -60,
            child: _GlowOrb(
              size: 250,
              color: const Color(0xFF6366F1).withValues(alpha: 0.12),
            ),
          ),

          // Content
          SafeArea(
            child: FadeTransition(
              opacity: _fadeIn,
              child: SlideTransition(
                position: _slideUp,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 56),

                      // Logo badge
                      ScaleTransition(
                        scale: _pulse,
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF3B82F6).withValues(alpha: 0.5),
                                blurRadius: 24,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.engineering_rounded,
                            color: Colors.white,
                            size: 38,
                          ),
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Headline
                      Text(
                        'Smart\nWorkers',
                        style: GoogleFonts.inter(
                          fontSize: 52,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          height: 1.05,
                          letterSpacing: -1.5,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Kerala\'s #1 platform for skilled workers.\nBook trusted professionals instantly.',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          color: Colors.white.withValues(alpha: 0.65),
                          height: 1.6,
                          fontWeight: FontWeight.w400,
                        ),
                      ),

                      const Spacer(),

                      // Feature chips
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: const [
                          _Chip(icon: Icons.verified_rounded, label: 'Verified Workers'),
                          _Chip(icon: Icons.flash_on_rounded, label: 'Instant Booking'),
                          _Chip(icon: Icons.lock_outline_rounded, label: 'Secure Payments'),
                        ],
                      ),

                      const SizedBox(height: 40),

                      // Primary CTA
                      _GradientButton(
                        onTap: () => Navigator.pushReplacement(
                          context,
                          _FadePageRoute(child: const LoginScreen()),
                        ),
                        label: 'Get Started',
                        icon: Icons.arrow_forward_rounded,
                      ),
                      const SizedBox(height: 14),

                      // Secondary CTA
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pushReplacement(
                            context,
                            _FadePageRoute(child: const LoginScreen()),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: BorderSide(
                              color: Colors.white.withValues(alpha: 0.25),
                              width: 1.5,
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: Text(
                            'Sign in to existing account',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Build version badge
          Positioned(
            bottom: 12,
            right: 16,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                ),
                child: Text(
                  'v0.1.1 build 2',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    color: Colors.white.withValues(alpha: 0.4),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: const Color(0xFF93C5FD)),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
        ],
      ),
    );
  }
}

class _GradientButton extends StatelessWidget {
  const _GradientButton({
    required this.onTap,
    required this.label,
    required this.icon,
  });
  final VoidCallback onTap;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF3B82F6).withValues(alpha: 0.45),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 8),
            Icon(icon, color: Colors.white, size: 20),
          ],
        ),
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.size, required this.color});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
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
}

class _ParticlePainter extends CustomPainter {
  _ParticlePainter(this.progress);
  final double progress;

  static final _rng = math.Random(42);
  static final _particles = List.generate(60, (i) => [
    _rng.nextDouble(), // x ratio
    _rng.nextDouble(), // y ratio
    _rng.nextDouble() * 3 + 0.5, // radius
    _rng.nextDouble(), // speed
    _rng.nextDouble(), // phase
  ]);

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in _particles) {
      final x = p[0] * size.width;
      final yBase = p[1] * size.height;
      final r = p[2];
      final speed = p[3];
      final phase = p[4];

      final yOffset = math.sin((progress * speed + phase) * math.pi * 2) * 12;
      final opacity = (math.sin((progress * speed + phase) * math.pi * 2) * 0.5 + 0.5) * 0.6 + 0.1;

      final paint = Paint()
        ..color = Colors.white.withValues(alpha: opacity)
        ..style = PaintingStyle.fill;

      canvas.drawCircle(Offset(x, yBase + yOffset), r, paint);
    }
  }

  @override
  bool shouldRepaint(_ParticlePainter old) => old.progress != progress;
}

class _FadePageRoute<T> extends PageRouteBuilder<T> {
  _FadePageRoute({required Widget child})
      : super(
          pageBuilder: (_, __, ___) => child,
          transitionsBuilder: (_, anim, __, child) =>
              FadeTransition(opacity: anim, child: child),
          transitionDuration: const Duration(milliseconds: 500),
        );
}
