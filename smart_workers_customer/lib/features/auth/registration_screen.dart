import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import 'auth_provider.dart';
import '../../../shared/app_shell.dart';

class RegistrationScreen extends ConsumerStatefulWidget {
  const RegistrationScreen({super.key});
  @override
  ConsumerState<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends ConsumerState<RegistrationScreen> {
  final _nameCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() { _nameCtrl.dispose(); super.dispose(); }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final error = await ref.read(authProvider.notifier)
        .completeProfile(_nameCtrl.text.trim());
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error, style: GoogleFonts.inter(color: Colors.white)),
        backgroundColor: kError,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
      return;
    }
    Navigator.pushAndRemoveUntil(context,
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => const AppShell(),
          transitionsBuilder: (_, anim, __, child) => FadeTransition(opacity: anim, child: child),
          transitionDuration: const Duration(milliseconds: 400),
        ), (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider.select((s) => s.isLoading));
    return Scaffold(
      backgroundColor: kBrandDeep,
      body: Container(
        decoration: const BoxDecoration(gradient: kBgGradient),
        child: SafeArea(child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Form(key: _formKey, child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),

              // ── Icon ─────────────────────────────────────────────────────
              Center(child: Stack(alignment: Alignment.center, children: [
                Container(width: 100, height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(colors: [
                      kBrandIndigo.withOpacity(0.2), Colors.transparent]))),
                Container(width: 80, height: 80,
                  decoration: BoxDecoration(
                    gradient: kBrandGradient,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [BoxShadow(color: kBrandIndigo.withOpacity(0.4),
                        blurRadius: 24, offset: const Offset(0, 8))]),
                  child: const Icon(Icons.waving_hand_rounded,
                      color: Colors.white, size: 36)),
              ])).animate().scale(begin: const Offset(0.5,0.5),
                  duration: 600.ms, curve: Curves.elasticOut),

              const SizedBox(height: 32),

              ShaderMask(
                shaderCallback: (b) => kBrandGradient.createShader(b),
                child: Text('Welcome aboard! 🎉', textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white)),
              ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 10),

              Text("Just one more step — what should we call you?",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: kBrandSubtext, fontSize: 14.5, height: 1.5),
              ).animate().fadeIn(delay: 300.ms),

              const SizedBox(height: 40),

              // ── Name field ─────────────────────────────────────────────────
              TextFormField(
                controller: _nameCtrl,
                textCapitalization: TextCapitalization.words,
                autofocus: true,
                style: GoogleFonts.inter(color: kBrandText, fontWeight: FontWeight.w600, fontSize: 16),
                decoration: InputDecoration(
                  labelText: 'Your Full Name',
                  hintText: 'e.g. Ravi Kumar',
                  hintStyle: GoogleFonts.inter(color: kBrandMuted, fontSize: 15),
                  prefixIcon: const Icon(Icons.badge_outlined, color: kBrandMuted),
                ),
                validator: (v) {
                  if (v == null || v.trim().length < 2) return 'Enter your name (min 2 characters)';
                  return null;
                },
              ).animate().fadeIn(delay: 350.ms).slideY(begin: 0.2, end: 0, delay: 350.ms),

              const SizedBox(height: 32),

              GradientButton(
                label: 'Get Started',
                isLoading: isLoading,
                onPressed: isLoading ? null : _save,
                icon: const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
              ).animate().fadeIn(delay: 450.ms),

              const SizedBox(height: 32),

              // ── Trust badges ──────────────────────────────────────────────
              Row(mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _TrustBadge(icon: Icons.shield_outlined, label: 'Secure'),
                  const SizedBox(width: 20),
                  _TrustBadge(icon: Icons.verified_outlined, label: 'Verified'),
                  const SizedBox(width: 20),
                  _TrustBadge(icon: Icons.star_outline_rounded, label: 'Rated 4.7★'),
                ],
              ).animate().fadeIn(delay: 550.ms),
            ],
          )),
        )),
      ),
    );
  }
}

class _TrustBadge extends StatelessWidget {
  const _TrustBadge({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Column(children: [
    Icon(icon, color: kBrandSubtext, size: 18),
    const SizedBox(height: 4),
    Text(label, style: GoogleFonts.inter(color: kBrandMuted, fontSize: 11)),
  ]);
}
