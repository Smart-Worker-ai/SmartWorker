import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'auth_provider.dart';
import 'registration_screen.dart';
import '../../../shared/app_shell.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({
    super.key,
    required this.phone,
    required this.verificationId,
    this.resendToken,
  });

  final String phone;
  final String verificationId;
  final int? resendToken;

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _ctrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _resending = false;
  String _currentVerificationId = '';
  int? _resendToken;

  @override
  void initState() {
    super.initState();
    _currentVerificationId = widget.verificationId;
    _resendToken = widget.resendToken;
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (!_formKey.currentState!.validate()) return;

    final credential = PhoneAuthProvider.credential(
      verificationId: _currentVerificationId,
      smsCode: _ctrl.text.trim(),
    );

    final result = await ref
        .read(authProvider.notifier)
        .signInWithFirebaseCredential(credential);

    if (!mounted) return;
    if (result.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result.error!), backgroundColor: Colors.red));
      return;
    }

    if (result.isNewUser) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const RegistrationScreen()),
      );
    } else {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const AppShell()),
        (_) => false,
      );
    }
  }

  Future<void> _resend() async {
    setState(() => _resending = true);
    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: widget.phone,
      forceResendingToken: _resendToken,
      timeout: const Duration(seconds: 60),
      verificationCompleted: (credential) async {
        await ref.read(authProvider.notifier).signInWithFirebaseCredential(credential);
      },
      verificationFailed: (e) {
        if (!mounted) return;
        setState(() => _resending = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(e.message ?? 'Could not resend OTP.'),
            backgroundColor: Colors.red));
      },
      codeSent: (verificationId, resendToken) {
        if (!mounted) return;
        setState(() {
          _resending = false;
          _currentVerificationId = verificationId;
          _resendToken = resendToken;
        });
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('OTP resent successfully.'),
            backgroundColor: Colors.green));
      },
      codeAutoRetrievalTimeout: (_) {},
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider.select((s) => s.isLoading));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Verify OTP')),
      body: Padding(
        padding: const EdgeInsets.all(28),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              Icon(Icons.sms_outlined, size: 52, color: theme.colorScheme.primary),
              const SizedBox(height: 16),
              Text(
                'Enter the 6-digit code sent to\n${widget.phone}',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge
                    ?.copyWith(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 32),
              TextFormField(
                controller: _ctrl,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                style: const TextStyle(fontSize: 28, letterSpacing: 12),
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: '• • • • • •',
                  hintStyle: TextStyle(fontSize: 24, letterSpacing: 8),
                ),
                validator: (v) {
                  if (v == null || v.trim().length != 6) {
                    return 'Enter the 6-digit OTP';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 28),
              FilledButton(
                onPressed: isLoading ? null : _verify,
                style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16)),
                child: isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('Verify', style: TextStyle(fontSize: 16)),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: _resending ? null : _resend,
                child: _resending
                    ? const Text('Sending...')
                    : const Text('Resend OTP'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
