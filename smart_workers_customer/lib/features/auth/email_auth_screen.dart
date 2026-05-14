import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/common_widgets.dart';
import '../../../shared/app_shell.dart';
import 'auth_provider.dart';

class EmailAuthScreen extends ConsumerStatefulWidget {
  const EmailAuthScreen({super.key});
  @override
  ConsumerState<EmailAuthScreen> createState() => _EmailAuthScreenState();
}

class _EmailAuthScreenState extends ConsumerState<EmailAuthScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  final _loginEmailCtrl    = TextEditingController();
  final _loginPasswordCtrl = TextEditingController();
  final _loginFormKey       = GlobalKey<FormState>();
  final _regNameCtrl        = TextEditingController();
  final _regEmailCtrl       = TextEditingController();
  final _regPasswordCtrl    = TextEditingController();
  final _regConfirmCtrl     = TextEditingController();
  final _regFormKey         = GlobalKey<FormState>();

  bool _loginObscure = true;
  bool _regObscure = true;
  bool _regConfirmObscure = true;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this)..addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tab.dispose();
    _loginEmailCtrl.dispose(); _loginPasswordCtrl.dispose();
    _regNameCtrl.dispose(); _regEmailCtrl.dispose();
    _regPasswordCtrl.dispose(); _regConfirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_loginFormKey.currentState!.validate()) return;
    final error = await ref.read(authProvider.notifier)
        .emailLogin(_loginEmailCtrl.text.trim(), _loginPasswordCtrl.text);
    if (!mounted) return;
    if (error != null) {
      showAppSnack(context, error.replaceAll('notFound:', '').trim());
      return;
    }
    Navigator.pushAndRemoveUntil(context, fadeRoute(const AppShell()), (_) => false);
  }

  Future<void> _register() async {
    if (!_regFormKey.currentState!.validate()) return;
    final result = await ref.read(authProvider.notifier).emailRegister(
        _regEmailCtrl.text.trim(), _regPasswordCtrl.text, _regNameCtrl.text.trim());
    if (!mounted) return;
    if (result.error != null) { showAppSnack(context, result.error!); return; }
    await ref.read(authProvider.notifier).logout();
    if (!mounted) return;
    _regNameCtrl.clear(); _regEmailCtrl.clear();
    _regPasswordCtrl.clear(); _regConfirmCtrl.clear();
    _tab.animateTo(0);
    showAppSnack(context, 'Account created! Please sign in.', kind: SnackKind.success);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final isLoading = ref.watch(authProvider.select((s) => s.isLoading));
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: c.bgGradient),
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(children: [
                const BackBtn(),
                const SizedBox(width: 14),
                Expanded(child: Text('Email Sign In',
                    style: GoogleFonts.inter(color: c.text, fontWeight: FontWeight.w800, fontSize: 18))),
              ]).animate().fadeIn(duration: 300.ms),
            ),
            const SizedBox(height: 20),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: c.border)),
                child: TabBar(
                  controller: _tab,
                  tabs: const [Tab(text: 'Sign In'), Tab(text: 'Create Account')],
                  labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13.5),
                  unselectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 13.5),
                  labelColor: Colors.white,
                  unselectedLabelColor: c.muted,
                  indicator: BoxDecoration(
                    gradient: c.brandGradient,
                    borderRadius: BorderRadius.circular(11)),
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: Colors.transparent,
                  padding: const EdgeInsets.all(4),
                ),
              ),
            ).animate().fadeIn(delay: 150.ms),

            const SizedBox(height: 8),

            Expanded(
              child: TabBarView(controller: _tab, children: [
                _EmailForm(
                  formKey: _loginFormKey,
                  isLogin: true,
                  emailCtrl: _loginEmailCtrl,
                  passwordCtrl: _loginPasswordCtrl,
                  obscure: _loginObscure,
                  onToggleObscure: () => setState(() => _loginObscure = !_loginObscure),
                  isLoading: isLoading,
                  onSubmit: isLoading ? null : _login,
                  onSwitchTab: () => _tab.animateTo(1),
                ),
                _EmailForm(
                  formKey: _regFormKey,
                  isLogin: false,
                  nameCtrl: _regNameCtrl,
                  emailCtrl: _regEmailCtrl,
                  passwordCtrl: _regPasswordCtrl,
                  confirmCtrl: _regConfirmCtrl,
                  obscure: _regObscure,
                  confirmObscure: _regConfirmObscure,
                  onToggleObscure: () => setState(() => _regObscure = !_regObscure),
                  onToggleConfirmObscure: () =>
                      setState(() => _regConfirmObscure = !_regConfirmObscure),
                  isLoading: isLoading,
                  onSubmit: isLoading ? null : _register,
                  onSwitchTab: () => _tab.animateTo(0),
                ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

class _EmailForm extends StatelessWidget {
  const _EmailForm({
    required this.formKey,
    required this.isLogin,
    required this.emailCtrl,
    required this.passwordCtrl,
    required this.obscure,
    required this.onToggleObscure,
    required this.isLoading,
    required this.onSubmit,
    required this.onSwitchTab,
    this.nameCtrl,
    this.confirmCtrl,
    this.confirmObscure = false,
    this.onToggleConfirmObscure,
  });

  final GlobalKey<FormState> formKey;
  final bool isLogin;
  final TextEditingController? nameCtrl;
  final TextEditingController emailCtrl;
  final TextEditingController passwordCtrl;
  final TextEditingController? confirmCtrl;
  final bool obscure;
  final bool confirmObscure;
  final VoidCallback onToggleObscure;
  final VoidCallback? onToggleConfirmObscure;
  final bool isLoading;
  final VoidCallback? onSubmit;
  final VoidCallback onSwitchTab;

  static String? _validatePassword(String? v) {
    if (v == null || v.isEmpty) return 'Enter a password';
    if (v.length < 8) return 'At least 8 characters required';
    if (!RegExp(r'[A-Z]').hasMatch(v)) return 'Must contain an uppercase letter';
    if (!RegExp(r'[0-9]').hasMatch(v)) return 'Must contain a number';
    if (!RegExp(r'[^A-Za-z0-9]').hasMatch(v)) return 'Must contain a special character';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!isLogin) ...[
              _Field(
                controller: nameCtrl!,
                label: 'Full Name',
                hint: 'e.g. Ravi Kumar',
                icon: Icons.badge_outlined,
                textCapitalization: TextCapitalization.words,
                validator: (v) => (v == null || v.trim().length < 2)
                    ? 'Enter your name (min 2 characters)' : null,
              ).animate().fadeIn(delay: 50.ms),
              const SizedBox(height: 14),
            ],

            _Field(
              controller: emailCtrl,
              label: 'Email Address',
              hint: 'you@example.com',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Enter your email';
                if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())) {
                  return 'Enter a valid email';
                }
                return null;
              },
            ).animate().fadeIn(delay: isLogin ? 50.ms : 100.ms),
            const SizedBox(height: 14),

            _Field(
              controller: passwordCtrl,
              label: 'Password',
              icon: Icons.lock_outline_rounded,
              obscure: obscure,
              suffix: IconButton(
                icon: Icon(obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    color: c.muted, size: 20),
                onPressed: onToggleObscure,
              ),
              helperText: isLogin ? null : 'Min 8 chars · uppercase · number · special char',
              validator: isLogin
                  ? (v) => (v == null || v.isEmpty) ? 'Enter your password' : null
                  : _validatePassword,
            ).animate().fadeIn(delay: isLogin ? 100.ms : 150.ms),

            if (!isLogin) ...[
              const SizedBox(height: 14),
              _Field(
                controller: confirmCtrl!,
                label: 'Confirm Password',
                icon: Icons.lock_outline_rounded,
                obscure: confirmObscure,
                suffix: IconButton(
                  icon: Icon(confirmObscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      color: c.muted, size: 20),
                  onPressed: onToggleConfirmObscure,
                ),
                validator: (v) => v != passwordCtrl.text ? 'Passwords do not match' : null,
              ).animate().fadeIn(delay: 200.ms),
            ],

            const SizedBox(height: 28),

            GradientButton(
              label: isLogin ? 'Sign In' : 'Create Account',
              isLoading: isLoading,
              onPressed: onSubmit,
            ).animate().fadeIn(delay: isLogin ? 200.ms : 250.ms),

            const SizedBox(height: 20),

            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(isLogin ? "Don't have an account?" : 'Already have an account?',
                style: GoogleFonts.inter(color: c.subtext, fontSize: 13)),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: onSwitchTab,
                child: Text(isLogin ? 'Create one' : 'Sign in',
                  style: GoogleFonts.inter(color: c.accent, fontSize: 13, fontWeight: FontWeight.w700)),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    this.hint,
    required this.icon,
    this.keyboardType,
    this.obscure = false,
    this.suffix,
    this.validator,
    this.textCapitalization = TextCapitalization.none,
    this.helperText,
  });
  final TextEditingController controller;
  final String label;
  final String? hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final bool obscure;
  final Widget? suffix;
  final String? Function(String?)? validator;
  final TextCapitalization textCapitalization;
  final String? helperText;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      textCapitalization: textCapitalization,
      style: GoogleFonts.inter(color: c.text, fontSize: 15),
      validator: validator,
      decoration: InputDecoration(
        labelText: label, hintText: hint,
        prefixIcon: Icon(icon, color: c.muted, size: 20),
        suffixIcon: suffix,
        helperText: helperText,
        helperStyle: GoogleFonts.inter(color: c.muted, fontSize: 11),
        helperMaxLines: 2,
      ),
    );
  }
}
