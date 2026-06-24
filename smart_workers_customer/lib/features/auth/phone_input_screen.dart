import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/common_widgets.dart';
import '../../../shared/app_shell.dart';
import 'auth_provider.dart';
import 'otp_screen.dart';
import 'registration_screen.dart';

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
      // Android SMS auto-retrieval: Firebase reads the SMS and signs in without user typing.
      verificationCompleted: (cred) async {
        if (!mounted) return;
        setState(() => _sending = true);
        final result = await ref.read(authProvider.notifier)
            .signInWithFirebaseCredential(cred);
        if (!mounted) return;
        setState(() => _sending = false);
        if (result.error != null) {
          showAppSnack(context, result.error!);
          return;
        }
        if (result.isNewUser) {
          Navigator.pushReplacement(context, slideRoute(const RegistrationScreen()));
        } else {
          Navigator.pushAndRemoveUntil(
              context, fadeRoute(const AppShell()), (_) => false);
        }
      },
      verificationFailed: (e) {
        if (!mounted) return;
        setState(() => _sending = false);
        showAppSnack(context, switch (e.code) {
          'invalid-phone-number'      => 'Invalid phone number. Use a valid 10-digit Indian number.',
          'too-many-requests'         => 'Too many OTP requests. Wait a few minutes.',
          'app-not-authorized'        => 'SHA-1 fingerprint not registered in Firebase Console. See FIREBASE_OTP_FIX.md.',
          'missing-client-identifier' => 'Phone Auth not configured. Enable Phone provider in Firebase Console.',
          'quota-exceeded'            => 'SMS quota exceeded. Try again tomorrow or use a test number.',
          _                           => e.message ?? 'Failed to send OTP.',
        });
      },
      codeSent: (verificationId, resendToken) {
        if (!mounted) return;
        setState(() => _sending = false);
        Navigator.push(context, slideRoute(OtpScreen(
            phone: phone, verificationId: verificationId, resendToken: resendToken)));
      },
      codeAutoRetrievalTimeout: (_) {},
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: c.bgGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 16),
                  const Align(alignment: Alignment.centerLeft, child: BackBtn()),
                  const SizedBox(height: 40),

                  Center(child: Container(
                    width: 80, height: 80,
                    decoration: BoxDecoration(
                      gradient: c.brandGradient,
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [BoxShadow(
                          color: c.accent.withValues(alpha: 0.35),
                          blurRadius: 24, offset: const Offset(0, 8))],
                    ),
                    child: const Icon(Icons.phone_android_rounded, color: Colors.white, size: 38),
                  )).animate().scale(begin: const Offset(0.6, 0.6),
                      duration: 500.ms, curve: Curves.elasticOut).fadeIn(duration: 400.ms),

                  const SizedBox(height: 28),
                  Text('Enter your mobile',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(color: c.text, fontWeight: FontWeight.w800, fontSize: 24),
                  ).animate().fadeIn(delay: 150.ms),

                  const SizedBox(height: 8),
                  Text("We'll send a 6-digit OTP to verify your number",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(color: c.subtext, fontSize: 14, height: 1.5),
                  ).animate().fadeIn(delay: 250.ms),

                  const SizedBox(height: 36),

                  Container(
                    decoration: BoxDecoration(
                      color: c.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: c.border)),
                    child: Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                        decoration: BoxDecoration(
                          border: Border(right: BorderSide(color: c.border))),
                        child: Row(children: [
                          const Text('🇮🇳', style: TextStyle(fontSize: 20)),
                          const SizedBox(width: 6),
                          Text('+91', style: GoogleFonts.inter(
                              color: c.text, fontWeight: FontWeight.w600, fontSize: 15)),
                        ]),
                      ),
                      Expanded(child: TextFormField(
                        controller: _ctrl,
                        keyboardType: TextInputType.phone,
                        autofocus: true,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(10),
                        ],
                        style: GoogleFonts.inter(color: c.text, fontWeight: FontWeight.w600,
                            fontSize: 18, letterSpacing: 2),
                        decoration: InputDecoration(
                          hintText: '98765 43210',
                          hintStyle: GoogleFonts.inter(color: c.muted, fontSize: 18, letterSpacing: 2),
                          border: InputBorder.none, enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          counterText: '',
                          filled: false,
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Enter your mobile number';
                          if (!RegExp(r'^[6-9]\d{9}$').hasMatch(v.trim())) {
                            return 'Enter a valid 10-digit Indian mobile number';
                          }
                          return null;
                        },
                      )),
                    ]),
                  ).animate().fadeIn(delay: 300.ms),

                  const SizedBox(height: 32),
                  GradientButton(
                    label: 'Send OTP', isLoading: _sending,
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.send_rounded, size: 18, color: Colors.white),
                  ).animate().fadeIn(delay: 400.ms),

                  const SizedBox(height: 24),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.lock_outline_rounded, size: 13, color: c.muted),
                    const SizedBox(width: 6),
                    Text('Your number is encrypted and never shared',
                      style: GoogleFonts.inter(color: c.muted, fontSize: 12)),
                  ]).animate().fadeIn(delay: 500.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
