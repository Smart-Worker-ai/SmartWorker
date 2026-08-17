import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../auth/auth_provider.dart';
import '../auth/welcome_screen.dart';
import '../grievance/grievance_screen.dart';

// Pre-defined avatar colors the user can pick from
const _avatarColors = [
  Color(0xFF1565C0), // blue
  Color(0xFF2E7D32), // green
  Color(0xFF6A1B9A), // purple
  Color(0xFFC62828), // red
  Color(0xFFF57C00), // orange
  Color(0xFF00838F), // teal
  Color(0xFF37474F), // slate
  Color(0xFFAD1457), // pink
];

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _editing = false;
  late TextEditingController _nameCtrl;
  int _colorIndex = 0;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    _nameCtrl = TextEditingController(text: user?['name'] as String? ?? '');
    _colorIndex = (user?['avatarColorIndex'] as num?)?.toInt() ?? 0;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final error = await ref.read(authProvider.notifier).completeProfile(
          _nameCtrl.text.trim(),
          avatarColorIndex: _colorIndex,
        );
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.red));
      return;
    }
    setState(() => _editing = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile updated'), backgroundColor: Colors.green),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider.select((s) => s.user));
    final theme = Theme.of(context);

    final name = user?['name'] as String? ?? 'Customer';
    final phone = user?['phone'] as String? ?? '';
    final email = user?['email'] as String? ?? '';
    final savedColorIndex = (user?['avatarColorIndex'] as num?)?.toInt() ?? 0;
    final avatarColor = _editing
        ? _avatarColors[_colorIndex]
        : _avatarColors[savedColorIndex.clamp(0, _avatarColors.length - 1)];

    final initials = (_editing ? _nameCtrl.text : name)
        .trim()
        .split(' ')
        .where((w) => w.isNotEmpty)
        .map((w) => w[0].toUpperCase())
        .take(2)
        .join();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          if (!_editing)
            TextButton.icon(
              onPressed: () {
                _nameCtrl.text = name;
                _colorIndex = savedColorIndex.clamp(0, _avatarColors.length - 1);
                setState(() => _editing = true);
              },
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Edit'),
            )
          else ...[
            TextButton(
              onPressed: () => setState(() => _editing = false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: _save,
              style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)),
              child: ref.watch(authProvider.select((s) => s.isLoading))
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save'),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // ── Avatar + name card ──────────────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Stack(
                      children: [
                        CircleAvatar(
                          radius: 44,
                          backgroundColor: avatarColor,
                          child: Text(
                            initials.isEmpty ? '?' : initials,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                        if (_editing)
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: GestureDetector(
                              onTap: () => _showColorPicker(context),
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.primary,
                                  shape: BoxShape.circle,
                                  border:
                                      Border.all(color: Colors.white, width: 2),
                                ),
                                child: const Icon(Icons.color_lens_outlined,
                                    color: Colors.white, size: 16),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (_editing)
                      TextFormField(
                        controller: _nameCtrl,
                        textCapitalization: TextCapitalization.words,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.w800),
                        decoration: const InputDecoration(
                          labelText: 'Full Name',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        onChanged: (_) => setState(() {}),
                        validator: (v) {
                          if (v == null || v.trim().length < 2) {
                            return 'Name must be at least 2 characters';
                          }
                          return null;
                        },
                      )
                    else ...[
                      Text(name,
                          style: theme.textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      if (phone.isNotEmpty)
                        Text(phone,
                            style: theme.textTheme.bodyMedium
                                ?.copyWith(color: context.c.subtext)),
                      if (email.isNotEmpty)
                        Text(email,
                            style: theme.textTheme.bodyMedium
                                ?.copyWith(color: context.c.subtext)),
                    ],
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text('Customer Account',
                          style: TextStyle(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 13)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Info tiles ───────────────────────────────────────────────
            if (!_editing)
              Card(
                child: Column(
                  children: [
                    _Tile(
                      icon: Icons.person_outline,
                      title: 'Name',
                      subtitle: name,
                    ),
                    if (phone.isNotEmpty) ...[
                      const Divider(height: 1, indent: 16, endIndent: 16),
                      _Tile(
                        icon: Icons.phone_outlined,
                        title: 'Mobile',
                        subtitle: phone,
                      ),
                    ],
                    if (email.isNotEmpty) ...[
                      const Divider(height: 1, indent: 16, endIndent: 16),
                      _Tile(
                        icon: Icons.email_outlined,
                        title: 'Email',
                        subtitle: email,
                      ),
                    ],
                  ],
                ),
              ),

            if (!_editing) ...[
              const SizedBox(height: 16),
              // ── Actions ────────────────────────────────────────────────
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.report_problem_outlined,
                          color: Colors.orange),
                      title: const Text('My Grievances',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: const Text('Report an issue with a worker or booking'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const GrievanceScreen()),
                      ),
                    ),
                    const Divider(height: 1, indent: 16, endIndent: 16),
                    const _Tile(
                      icon: Icons.info_outline,
                      title: 'About',
                      subtitle: 'HAYAKU v1.2.1',
                    ),
                    const Divider(height: 1, indent: 16, endIndent: 16),
                    const _Tile(
                      icon: Icons.support_agent_outlined,
                      title: 'Support',
                      subtitle: 'support@crewzo.in',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ── Logout ─────────────────────────────────────────────────
              OutlinedButton.icon(
                onPressed: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
                      (_) => false,
                    );
                  }
                },
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text('Logout',
                    style: TextStyle(color: Colors.red, fontSize: 16)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showColorPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setSt) => Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: context.c.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Text('Choose Avatar Color',
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700,
                      color: context.c.text)),
              const SizedBox(height: 20),
              Wrap(
                spacing: 16,
                runSpacing: 16,
                children: List.generate(_avatarColors.length, (i) {
                  final selected = _colorIndex == i;
                  return GestureDetector(
                    onTap: () {
                      setSt(() {});
                      setState(() => _colorIndex = i);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: _avatarColors[i],
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selected ? context.c.text : Colors.transparent,
                          width: 3,
                        ),
                        boxShadow: selected
                            ? [
                                BoxShadow(
                                  color: _avatarColors[i].withValues(alpha: 0.5),
                                  blurRadius: 8,
                                  spreadRadius: 2,
                                )
                              ]
                            : [],
                      ),
                      child: selected
                          ? const Icon(Icons.check,
                              color: Colors.white, size: 24)
                          : null,
                    ),
                  );
                }),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Done'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile(
      {required this.icon, required this.title, required this.subtitle});
  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: context.c.muted),
      title: Text(title,
          style: TextStyle(fontSize: 13, color: context.c.subtext)),
      subtitle: Text(subtitle,
          style: TextStyle(
              fontWeight: FontWeight.w600,
              color: context.c.text,
              fontSize: 15)),
    );
  }
}
