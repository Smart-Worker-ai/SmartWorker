import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import 'auth_provider.dart';
import 'registration_screen.dart';
import '../../../shared/app_shell.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.phone,
      required this.verificationId, this.resendToken});
  final String phone;
  final String verificationId;
  final int? resendToken;
  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  // 6 separate controllers for OTP boxes
  final _ctrls = List.generate(6, (_) => TextEditingController());
  final _nodes = List.generate(6, (_) => FocusNode());
  bool _resending = false;
  int _countdown = 30;
  Timer? _timer;
  String _currentVerificationId = '';
  int? _resendToken;

  @override
  void initState() {
    super.initState();
    _currentVerificationId = widget.verificationId;
    _resendToken = widget.resendToken;
    _startTimer();
  }

  void _startTimer() {
    _countdown = 30;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() { if (_countdown > 0) _countdown--; });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _ctrls) c.dispose();
    for (final n in _nodes) n.dispose();
    super.dispose();
  }

  String get _otp => _ctrls.map((c) => c.text).join();

  Future<void> _verify() async {
    if (_otp.length != 6) { _snack('Enter the complete 6-digit OTP'); return; }
    final credential = PhoneAuthProvider.credential(
        verificationId: _currentVerificationId, smsCode: _otp);
    final result = await ref.read(authProvider.notifier)
        .signInWithFirebaseCredential(credential);
    if (!mounted) return;
    if (result.error != null) { _snack(result.error!); return; }
    if (result.isNewUser) {
      Navigator.pushReplacement(context, _slide(const RegistrationScreen()));
    } else {
      Navigator.pushAndRemoveUntil(context,
          _slide(const AppShell()), (_) => false);
    }
  }

  Future<void> _resend() async {
    setState(() => _resending = true);
    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: widget.phone,
      forceResendingToken: _resendToken,
      timeout: const Duration(seconds: 60),
      verificationCompleted: (cred) async =>
          ref.read(authProvider.notifier).signInWithFirebaseCredential(cred),
      verificationFailed: (e) {
        if (!mounted) return;
        setState(() => _resending = false);
        _snack(e.message ?? 'Could not resend OTP.');
      },
      codeSent: (verificationId, resendToken) {
        if (!mounted) return;
        setState(() { _resending = false;
          _currentVerificationId = verificationId;
          _resendToken = resendToken;
        });
        _startTimer();
        _snack('OTP resent successfully!', isSuccess: true);
      },
      codeAutoRetrievalTimeout: (_) {},
    );
  }

  void _snack(String msg, {bool isSuccess = false}) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg, style: GoogleFonts.inter(color: Colors.white)),
        backgroundColor: isSuccess ? kSuccess : kError,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider.select((s) => s.isLoading));
    return Scaffold(
      backgroundColor: kBrandDeep,
      body: Container(
        decoration: const BoxDecoration(gradient: kBgGradient),
        child: SafeArea(child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SizedBox(height: 16),
            Align(alignment: Alignment.centerLeft,
              child: _BackBtn(onTap: () => Navigator.pop(context))),
            const SizedBox(height: 40),

            Center(child: Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                gradient: kBrandGradient,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [BoxShadow(color: kBrandIndigo.withOpacity(0.4),
                    blurRadius: 24, offset: const Offset(0, 8))],
              ),
              child: const Icon(Icons.message_rounded, color: Colors.white, size: 36),
            )).animate().scale(begin: const Offset(0.6,0.6),
                duration: 500.ms, curve: Curves.elasticOut),

            const SizedBox(height: 28),
            Text('Verify your number', textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: kBrandText,
                  fontWeight: FontWeight.w800, fontSize: 24),
            ).animate().fadeIn(delay: 150.ms),
            const SizedBox(height: 8),
            RichText(textAlign: TextAlign.center, text: TextSpan(
              style: GoogleFonts.inter(color: kBrandSubtext, fontSize: 14, height: 1.5),
              children: [
                const TextSpan(text: 'Code sent to '),
                TextSpan(text: widget.phone,
                  style: GoogleFonts.inter(color: kBrandText, fontWeight: FontWeight.w700)),
              ],
            )).animate().fadeIn(delay: 250.ms),

            const SizedBox(height: 40),

            // ── 6 OTP boxes ──────────────────────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(6, (i) => _OtpBox(
                controller: _ctrls[i],
                focusNode: _nodes[i],
                onChanged: (v) {
                  if (v.isNotEmpty && i < 5) {
                    FocusScope.of(context).requestFocus(_nodes[i + 1]);
                  }
                  if (v.isEmpty && i > 0) {
                    FocusScope.of(context).requestFocus(_nodes[i - 1]);
                  }
                  if (_otp.length == 6) _verify();
                },
              )),
            ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.2, end: 0, delay: 300.ms),

            const SizedBox(height: 36),

            GradientButton(
              label: isLoading ? 'Verifying…' : 'Verify OTP',
              isLoading: isLoading,
              onPressed: isLoading ? null : _verify,
            ).animate().fadeIn(delay: 400.ms),

            const SizedBox(height: 24),

            // ── Resend row ────────────────────────────────────────────────────
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text("Didn't receive the code?",
                style: GoogleFonts.inter(color: kBrandSubtext, fontSize: 13)),
              const SizedBox(width: 4),
              if (_countdown > 0)
                Text('Resend in ${_countdown}s',
                  style: GoogleFonts.inter(color: kBrandMuted,
                      fontSize: 13, fontWeight: FontWeight.w600))
              else
                GestureDetector(
                  onTap: _resending ? null : _resend,
                  child: Text(_resending ? 'Sending…' : 'Resend OTP',
                    style: GoogleFonts.inter(color: kBrandBlue,
                        fontSize: 13, fontWeight: FontWeight.w700)),
                ),
            ]).animate().fadeIn(delay: 500.ms),
          ]),
        )),
      ),
    );
  }
}

class _OtpBox extends StatelessWidget {
  const _OtpBox({required this.controller, required this.focusNode,
      required this.onChanged});
  final TextEditingController controller;
  final FocusNode focusNode;
  final void Function(String) onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 46,
      height: 56,
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        onChanged: onChanged,
        style: GoogleFonts.inter(color: kBrandText,
            fontWeight: FontWeight.w800, fontSize: 22),
        decoration: InputDecoration(
          counterText: '',
          filled: true,
          fillColor: kBrandSurface,
          contentPadding: EdgeInsets.zero,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: kBrandBorder)),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: kBrandBorder)),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: kBrandBlue, width: 2)),
        ),
      ),
    );
  }
}

PageRoute _slide(Widget page) => PageRouteBuilder(
  pageBuilder: (_, __, ___) => page,
  transitionsBuilder: (_, anim, __, child) => SlideTransition(
    position: Tween(begin: const Offset(1, 0), end: Offset.zero)
        .animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
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
