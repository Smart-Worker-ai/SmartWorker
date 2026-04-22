import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import 'phone_input_screen.dart';
import 'email_auth_screen.dart';
import 'terms_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: kBgGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),

                // ── Logo + Badge ──────────────────────────────────────────────
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        gradient: kBrandGradient,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.construction_rounded,
                          color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 10),
                    Text('SmartWorkers',
                        style: GoogleFonts.inter(
                            color: kBrandText,
                            fontWeight: FontWeight.w800,
                            fontSize: 17)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: kBrandBlue.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: kBrandBlue.withOpacity(0.4), width: 1),
                      ),
                      child: Text('Kerala',
                          style: GoogleFonts.inter(
                              color: kBrandBlue,
                              fontSize: 11,
                              fontWeight: FontWeight.w600)),
                    ),
                  ],
                ).animate().fadeIn(duration: 400.ms),

                const Spacer(flex: 2),

                // ── Hero Illustration ─────────────────────────────────────────
                Center(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 160,
                        height: 160,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(colors: [
                            kBrandBlue.withOpacity(0.18),
                            Colors.transparent,
                          ]),
                        ),
                      ).animate(onPlay: (c) => c.repeat(reverse: true))
                          .scale(
                              begin: const Offset(0.95, 0.95),
                              end: const Offset(1.05, 1.05),
                              duration: 2000.ms,
                              curve: Curves.easeInOut),
                      Container(
                        width: 110,
                        height: 110,
                        decoration: BoxDecoration(
                          gradient: kBrandGradient,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                                color: kBrandBlue.withOpacity(0.4),
                                blurRadius: 32,
                                spreadRadius: 2),
                          ],
                        ),
                        child: const Icon(Icons.construction_rounded,
                            color: Colors.white, size: 52),
                      ),
                    ],
                  ),
                ).animate().scale(
                    begin: const Offset(0.7, 0.7),
                    duration: 600.ms,
                    curve: Curves.elasticOut),

                const SizedBox(height: 36),

                // ── Headline ──────────────────────────────────────────────────
                ShaderMask(
                  shaderCallback: (bounds) =>
                      kBrandGradient.createShader(bounds),
                  child: Text(
                    'Book Skilled Workers\nInstantly',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      height: 1.22,
                    ),
                  ),
                ).animate().fadeIn(delay: 200.ms).slideY(
                    begin: 0.3, end: 0, delay: 200.ms, duration: 500.ms),

                const SizedBox(height: 14),

                Text(
                  'Electricians, plumbers, carpenters & more —\nverified, rated, and ready near you.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                      color: kBrandSubtext, fontSize: 14.5, height: 1.6),
                ).animate().fadeIn(delay: 350.ms),

                const Spacer(flex: 2),

                // ── Feature Pills ─────────────────────────────────────────────
                Row(
                  children: [
                    _FeaturePill(
                        icon: Icons.location_on_rounded,
                        label: 'Local',
                        color: const Color(0xFF3B82F6)),
                    const SizedBox(width: 8),
                    _FeaturePill(
                        icon: Icons.verified_rounded,
                        label: 'Verified',
                        color: const Color(0xFF10B981)),
                    const SizedBox(width: 8),
                    _FeaturePill(
                        icon: Icons.currency_rupee_rounded,
                        label: 'Transparent',
                        color: const Color(0xFFF59E0B)),
                  ],
                )
                    .animate()
                    .fadeIn(delay: 450.ms)
                    .slideY(begin: 0.4, end: 0, delay: 450.ms),

                const Spacer(flex: 1),

                // ── CTA Buttons ───────────────────────────────────────────────
                GradientButton(
                  label: 'Continue with Phone (OTP)',
                  icon: const Icon(Icons.phone_android_rounded,
                      size: 18, color: Colors.white),
                  onPressed: () => _goToPhone(context),
                ).animate().fadeIn(delay: 550.ms).slideY(
                    begin: 0.5, end: 0, delay: 550.ms, duration: 500.ms),

                const SizedBox(height: 12),

                OutlineGhostButton(
                  label: 'Continue with Email',
                  icon: const Icon(Icons.email_outlined,
                      size: 18, color: kBrandSubtext),
                  onPressed: () => _goToEmail(context),
                ).animate().fadeIn(delay: 650.ms),

                const SizedBox(height: 28),

                Text(
                  'By continuing you agree to our Terms & Privacy Policy',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                      color: kBrandMuted, fontSize: 11.5),
                ).animate().fadeIn(delay: 700.ms),

                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _goToPhone(BuildContext ctx) {
    Navigator.push(
      ctx,
      _slide(TermsScreen(
        onAccept: () => Navigator.pushReplacement(
          ctx,
          _slide(const PhoneInputScreen()),
        ),
      )),
    );
  }

  void _goToEmail(BuildContext ctx) {
    Navigator.push(
      ctx,
      _slide(TermsScreen(
        onAccept: () => Navigator.pushReplacement(
          ctx,
          _slide(const EmailAuthScreen()),
        ),
      )),
    );
  }
}

PageRoute _slide(Widget page) => PageRouteBuilder(
      pageBuilder: (_, __, ___) => page,
      transitionsBuilder: (_, anim, __, child) => SlideTransition(
        position:
            Tween(begin: const Offset(1, 0), end: Offset.zero).animate(
          CurvedAnimation(parent: anim, curve: Curves.easeOutCubic),
        ),
        child: child,
      ),
      transitionDuration: const Duration(milliseconds: 320),
    );

class _FeaturePill extends StatelessWidget {
  const _FeaturePill(
      {required this.icon, required this.label, required this.color});

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3), width: 1),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(label,
                style: GoogleFonts.inter(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
