import 'package:flutter/material.dart';
import 'phone_input_screen.dart';
import 'email_auth_screen.dart';
import 'terms_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(flex: 2),
              // Illustration
              Center(
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.construction_rounded,
                    size: 64,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Book a Worker',
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Find skilled electricians, plumbers, carpenters\nand more — right in your neighbourhood.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: Colors.grey.shade600,
                  height: 1.5,
                ),
              ),
              const Spacer(flex: 2),
              // Feature highlights
              const _FeatureTile(
                icon: Icons.location_on_outlined,
                title: 'Local Workers',
                subtitle: 'Filter by your district and area',
                color: Colors.blue,
              ),
              const SizedBox(height: 12),
              const _FeatureTile(
                icon: Icons.verified_user_outlined,
                title: 'Verified Profiles',
                subtitle: 'Rated by real customers like you',
                color: Colors.green,
              ),
              const SizedBox(height: 12),
              const _FeatureTile(
                icon: Icons.currency_rupee,
                title: 'Transparent Pricing',
                subtitle: 'See the full cost before you book',
                color: Colors.orange,
              ),
              const Spacer(flex: 1),
              FilledButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => TermsScreen(
                      onAccept: () => Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const PhoneInputScreen()),
                      ),
                    ),
                  ),
                ),
                style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16)),
                child: const Text('Continue with Phone (OTP)',
                    style: TextStyle(fontSize: 16)),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => TermsScreen(
                      onAccept: () => Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const EmailAuthScreen()),
                      ),
                    ),
                  ),
                ),
                style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16)),
                icon: const Icon(Icons.email_outlined),
                label: const Text('Continue with Email',
                    style: TextStyle(fontSize: 16)),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            Text(subtitle,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          ],
        ),
      ],
    );
  }
}
