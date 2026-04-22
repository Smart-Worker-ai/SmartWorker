import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main.dart';
import '../core/theme/app_theme.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeModeProvider);
    final isDark = themeMode == ThemeMode.dark;
    final isML = locale.languageCode == 'ml';

    return Scaffold(
      appBar: AppBar(
        title: Text(isML ? 'ക്രമീകരണങ്ങൾ' : 'Settings',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _SectionHeader(title: isML ? 'രൂപം' : 'Appearance'),
          _SettingsTile(
            icon: isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
            iconColor: isDark ? const Color(0xFF818CF8) : const Color(0xFFF59E0B),
            title: isML ? 'ഡാർക്ക് മോഡ്' : 'Dark Mode',
            subtitle: isML
                ? (isDark ? 'ഇപ്പോൾ: ഡാർക്ക്' : 'ഇപ്പോൾ: ലൈറ്റ്')
                : (isDark ? 'Currently: Dark' : 'Currently: Light'),
            trailing: Switch.adaptive(
              value: isDark,
              activeThumbColor: AppColors.primary,
              activeTrackColor: AppColors.primary.withValues(alpha: 0.5),
              onChanged: (v) {
                ref.read(themeModeProvider.notifier).state =
                    v ? ThemeMode.dark : ThemeMode.light;
              },
            ),
          ),
          const SizedBox(height: 8),
          _SectionHeader(title: isML ? 'ഭാഷ' : 'Language'),
          _SettingsTile(
            icon: Icons.translate_rounded,
            iconColor: const Color(0xFF10B981),
            title: isML ? 'ഭാഷ' : 'Language',
            subtitle: isML ? 'മലയാളം' : 'English',
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _LangButton(label: 'EN', selected: !isML, onTap: () {
                  ref.read(localeModeProvider.notifier).state = const Locale('en');
                }),
                const SizedBox(width: 8),
                _LangButton(label: 'മല', selected: isML, onTap: () {
                  ref.read(localeModeProvider.notifier).state = const Locale('ml');
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(title,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
            letterSpacing: 0.8,
          )),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.trailing,
  });
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
                Text(subtitle,
                    style: GoogleFonts.inter(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary)),
              ],
            ),
          ),
          trailing,
        ],
      ),
    );
  }
}

class _LangButton extends StatelessWidget {
  const _LangButton({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : AppColors.textSecondary,
            )),
      ),
    );
  }
}
