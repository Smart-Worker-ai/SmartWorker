import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import 'auth_provider.dart';
import 'otp_screen.dart';

class PhoneInputScreen extends ConsumerStatefulWidget {
  const PhoneInputScreen({super.key});
  @override
  ConsumerState<PhoneInputScreen> createState() => _PhoneInputScreenState();
}

class _PhoneInputScreenState extends ConsumerState<PhoneInputScreen> {
  final _ctrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _sending = false;

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Future<void> _send() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _sending = true);
    final phone = '+91${_ctrl.text.trim()}';
    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: phone,
      timeout: const Duration(seconds: 60),
      verificationCompleted: (cred) async =>
          ref.read(authProvider.notifier).signInWithFirebaseCredential(cred),
      verificationFailed: (e) {
        if (!mounted) return;
        setState(() => _sending = false);
        _snack(switch (e.code) {
          'invalid-phone-number' => 'Invalid phone number. Use a valid 10-digit Indian number.',
          'too-many-requests'    => 'Too many OTP requests. Wait a few minutes.',
          _                      => e.message ?? 'Failed to send OTP.',
        });
      },
      codeSent: (verificationId, resendToken) {
        if (!mounted) return;
        setState(() => _sending = false);
        Navigator.push(context, _slide(OtpScreen(
            phone: phone, verificationId: verificationId, resendToken: resendToken)));
      },
      codeAutoRetrievalTimeout: (_) {},
    );
  }

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(msg, style: GoogleFonts.inter(color: Colors.white)),
    backgroundColor: kError,
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  ));

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: kBrandDeep,
    body: Container(
      decoration: const BoxDecoration(gradient: kBgGradient),
      child: SafeArea(child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Form(key: _formKey, child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 16),
            Align(alignment: Alignment.centerLeft,
              child: _BackBtn(onTap: () => Navigator.pop(context))),

            const SizedBox(height: 40),

            Center(child: Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                gradient: kBrandGradient,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [BoxShadow(color: kBrandBlue.withOpacity(0.35),
                    blurRadius: 24, offset: const Offset(0, 8))],
              ),
              child: const Icon(Icons.phone_android_rounded, color: Colors.white, size: 38),
            )).animate().scale(begin: const Offset(0.6,0.6), duration: 500.ms,
                curve: Curves.elasticOut).fadeIn(duration: 400.ms),

            const SizedBox(height: 28),
            Text('Enter your mobile', textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: kBrandText, fontWeight: FontWeight.w800, fontSize: 24),
            ).animate().fadeIn(delay: 150.ms),
            const SizedBox(height: 8),
            Text("We'll send a 6-digit OTP to verify your number",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: kBrandSubtext, fontSize: 14, height: 1.5),
            ).animate().fadeIn(delay: 250.ms),
            const SizedBox(height: 36),

            // Custom phone field
            Container(
              decoration: BoxDecoration(
                color: kBrandSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: kBrandBorder)),
              child: Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                  decoration: BoxDecoration(
                    border: Border(right: BorderSide(color: kBrandBorder))),
                  child: Row(children: [
                    const Text('🇮🇳', style: TextStyle(fontSize: 20)),
                    const SizedBox(width: 6),
                    Text('+91', style: GoogleFonts.inter(
                        color: kBrandText, fontWeight: FontWeight.w600, fontSize: 15)),
                  ]),
                ),
                Expanded(child: TextFormField(
                  controller: _ctrl,
                  keyboardType: TextInputType.phone,
                  autofocus: true,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10)],
                  style: GoogleFonts.inter(color: kBrandText, fontWeight: FontWeight.w600,
                      fontSize: 18, letterSpacing: 2),
                  decoration: InputDecoration(
                    hintText: '98765 43210',
                    hintStyle: GoogleFonts.inter(color: kBrandMuted, fontSize: 18, letterSpacing: 2),
                    border: InputBorder.none, enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    counterText: ''),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Enter your mobile number';
                    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(v.trim()))
                      return 'Enter a valid 10-digit Indian mobile number';
                    return null;
                  },
                )),
              ]),
            ).animate().fadeIn(delay: 300.ms),

            const SizedBox(height: 32),
            GradientButton(label: 'Send OTP', isLoading: _sending,
              onPressed: _sending ? null : _send,
              icon: const Icon(Icons.send_rounded, size: 18, color: Colors.white),
            ).animate().fadeIn(delay: 400.ms),

            const SizedBox(height: 24),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.lock_outline_rounded, size: 13, color: kBrandMuted),
              const SizedBox(width: 6),
              Text('Your number is encrypted and never shared',
                style: GoogleFonts.inter(color: kBrandMuted, fontSize: 12)),
            ]).animate().fadeIn(delay: 500.ms),
          ],
        )),
      )),
    ),
  );
}

PageRoute _slide(Widget page) => PageRouteBuilder(
  pageBuilder: (_, __, ___) => page,
  transitionsBuilder: (_, anim, __, child) => SlideTransition(
    position: Tween(begin: const Offset(1, 0), end: Offset.zero).animate(
        CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
    child: child,
  ),
  transitionDuration: const Duration(milliseconds: 320),
);

class _BackBtn extends StatelessWidget {
  const _BackBtn({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: kBrandSurface, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kBrandBorder)),
      child: const Icon(Icons.arrow_back_ios_new_rounded, color: kBrandText, size: 18),
    ),
  );
}
