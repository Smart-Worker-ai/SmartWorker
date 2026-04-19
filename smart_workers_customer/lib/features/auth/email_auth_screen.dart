import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import '../../../shared/app_shell.dart';

class EmailAuthScreen extends ConsumerStatefulWidget {
  const EmailAuthScreen({super.key});

  @override
  ConsumerState<EmailAuthScreen> createState() => _EmailAuthScreenState();
}

class _EmailAuthScreenState extends ConsumerState<EmailAuthScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  // Login controllers
  final _loginEmailCtrl = TextEditingController();
  final _loginPasswordCtrl = TextEditingController();
  final _loginFormKey = GlobalKey<FormState>();

  // Register controllers
  final _regNameCtrl = TextEditingController();
  final _regEmailCtrl = TextEditingController();
  final _regPasswordCtrl = TextEditingController();
  final _regConfirmCtrl = TextEditingController();
  final _regFormKey = GlobalKey<FormState>();

  bool _loginObscure = true;
  bool _regObscure = true;
  bool _regConfirmObscure = true;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    _loginEmailCtrl.dispose();
    _loginPasswordCtrl.dispose();
    _regNameCtrl.dispose();
    _regEmailCtrl.dispose();
    _regPasswordCtrl.dispose();
    _regConfirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_loginFormKey.currentState!.validate()) return;
    final error = await ref
        .read(authProvider.notifier)
        .emailLogin(_loginEmailCtrl.text.trim(), _loginPasswordCtrl.text);
    if (!mounted) return;
    if (error != null) {
      // If account not found, offer to register
      final isNotFound = error.contains('notFound') ||
          error.toLowerCase().contains('invalid email or password');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.replaceAll('notFound:', '').trim()),
          backgroundColor: Colors.red,
          action: isNotFound
              ? SnackBarAction(
                  label: 'Register',
                  textColor: Colors.white,
                  onPressed: () => _tab.animateTo(1),
                )
              : null,
        ),
      );
      return;
    }
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const AppShell()),
      (_) => false,
    );
  }

  Future<void> _register() async {
    if (!_regFormKey.currentState!.validate()) return;
    final result = await ref.read(authProvider.notifier).emailRegister(
          _regEmailCtrl.text.trim(),
          _regPasswordCtrl.text,
          _regNameCtrl.text.trim(),
        );
    if (!mounted) return;
    if (result.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result.error!), backgroundColor: Colors.red));
      return;
    }
    // Logout immediately and redirect to login tab
    await ref.read(authProvider.notifier).logout();
    if (!mounted) return;
    _regNameCtrl.clear();
    _regEmailCtrl.clear();
    _regPasswordCtrl.clear();
    _regConfirmCtrl.clear();
    _tab.animateTo(0);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Account created! Please log in.'),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider.select((s) => s.isLoading));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Continue with Email'),
        bottom: TabBar(
          controller: _tab,
          tabs: const [Tab(text: 'Login'), Tab(text: 'Register')],
          indicatorColor: theme.colorScheme.primary,
          labelColor: theme.colorScheme.primary,
          unselectedLabelColor: Colors.grey,
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _LoginTab(
            formKey: _loginFormKey,
            emailCtrl: _loginEmailCtrl,
            passwordCtrl: _loginPasswordCtrl,
            obscure: _loginObscure,
            onToggleObscure: () => setState(() => _loginObscure = !_loginObscure),
            onSubmit: isLoading ? null : _login,
            isLoading: isLoading,
            onRegisterTap: () => _tab.animateTo(1),
          ),
          _RegisterTab(
            formKey: _regFormKey,
            nameCtrl: _regNameCtrl,
            emailCtrl: _regEmailCtrl,
            passwordCtrl: _regPasswordCtrl,
            confirmCtrl: _regConfirmCtrl,
            obscure: _regObscure,
            confirmObscure: _regConfirmObscure,
            onToggleObscure: () => setState(() => _regObscure = !_regObscure),
            onToggleConfirmObscure: () =>
                setState(() => _regConfirmObscure = !_regConfirmObscure),
            onSubmit: isLoading ? null : _register,
            isLoading: isLoading,
            onLoginTap: () => _tab.animateTo(0),
          ),
        ],
      ),
    );
  }
}

// ── Password validator (matches backend rules) ────────────────────────────────

String? _validatePassword(String? v) {
  if (v == null || v.isEmpty) return 'Enter a password';
  if (v.length < 8) return 'At least 8 characters required';
  if (!RegExp(r'[A-Z]').hasMatch(v)) return 'Must contain an uppercase letter';
  if (!RegExp(r'[0-9]').hasMatch(v)) return 'Must contain a number';
  if (!RegExp(r'[^A-Za-z0-9]').hasMatch(v)) return 'Must contain a special character';
  return null;
}

// ── Login Tab ─────────────────────────────────────────────────────────────────

class _LoginTab extends StatelessWidget {
  const _LoginTab({
    required this.formKey,
    required this.emailCtrl,
    required this.passwordCtrl,
    required this.obscure,
    required this.onToggleObscure,
    required this.onSubmit,
    required this.isLoading,
    required this.onRegisterTap,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final TextEditingController passwordCtrl;
  final bool obscure;
  final VoidCallback onToggleObscure;
  final VoidCallback? onSubmit;
  final bool isLoading;
  final VoidCallback onRegisterTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(28),
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 16),
            Icon(Icons.lock_outline_rounded, size: 52, color: theme.colorScheme.primary),
            const SizedBox(height: 8),
            Text('Welcome back',
                textAlign: TextAlign.center,
                style: theme.textTheme.titleMedium
                    ?.copyWith(color: Colors.grey.shade600)),
            const SizedBox(height: 32),
            TextFormField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_outlined),
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Enter your email';
                if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())) {
                  return 'Enter a valid email';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: passwordCtrl,
              obscureText: obscure,
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: const Icon(Icons.lock_outline),
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: Icon(obscure ? Icons.visibility_off : Icons.visibility),
                  onPressed: onToggleObscure,
                ),
              ),
              validator: (v) =>
                  (v == null || v.isEmpty) ? 'Enter your password' : null,
            ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: onSubmit,
              style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16)),
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Login', style: TextStyle(fontSize: 16)),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text("Don't have an account?",
                    style: TextStyle(color: Colors.grey.shade600)),
                TextButton(
                  onPressed: onRegisterTap,
                  child: const Text('Register'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Register Tab ──────────────────────────────────────────────────────────────

class _RegisterTab extends StatelessWidget {
  const _RegisterTab({
    required this.formKey,
    required this.nameCtrl,
    required this.emailCtrl,
    required this.passwordCtrl,
    required this.confirmCtrl,
    required this.obscure,
    required this.confirmObscure,
    required this.onToggleObscure,
    required this.onToggleConfirmObscure,
    required this.onSubmit,
    required this.isLoading,
    required this.onLoginTap,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController nameCtrl;
  final TextEditingController emailCtrl;
  final TextEditingController passwordCtrl;
  final TextEditingController confirmCtrl;
  final bool obscure;
  final bool confirmObscure;
  final VoidCallback onToggleObscure;
  final VoidCallback onToggleConfirmObscure;
  final VoidCallback? onSubmit;
  final bool isLoading;
  final VoidCallback onLoginTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(28),
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 16),
            Icon(Icons.person_add_outlined, size: 52, color: theme.colorScheme.primary),
            const SizedBox(height: 8),
            Text('Create your account',
                textAlign: TextAlign.center,
                style: theme.textTheme.titleMedium
                    ?.copyWith(color: Colors.grey.shade600)),
            const SizedBox(height: 32),
            TextFormField(
              controller: nameCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Full Name',
                prefixIcon: Icon(Icons.badge_outlined),
                border: OutlineInputBorder(),
                hintText: 'e.g. Ravi Kumar',
              ),
              validator: (v) {
                if (v == null || v.trim().length < 2) {
                  return 'Enter your name (min 2 characters)';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_outlined),
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Enter your email';
                if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())) {
                  return 'Enter a valid email';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: passwordCtrl,
              obscureText: obscure,
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: const Icon(Icons.lock_outline),
                border: const OutlineInputBorder(),
                helperText: 'Min 8 chars · uppercase · number · special char',
                suffixIcon: IconButton(
                  icon: Icon(obscure ? Icons.visibility_off : Icons.visibility),
                  onPressed: onToggleObscure,
                ),
              ),
              validator: _validatePassword,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: confirmCtrl,
              obscureText: confirmObscure,
              decoration: InputDecoration(
                labelText: 'Confirm Password',
                prefixIcon: const Icon(Icons.lock_outline),
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: Icon(
                      confirmObscure ? Icons.visibility_off : Icons.visibility),
                  onPressed: onToggleConfirmObscure,
                ),
              ),
              validator: (v) {
                if (v != passwordCtrl.text) return 'Passwords do not match';
                return null;
              },
            ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: onSubmit,
              style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16)),
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Create Account', style: TextStyle(fontSize: 16)),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Already have an account?',
                    style: TextStyle(color: Colors.grey.shade600)),
                TextButton(
                  onPressed: onLoginTap,
                  child: const Text('Login'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
