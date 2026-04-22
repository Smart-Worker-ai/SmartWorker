import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../features/worker_profile/worker_profile_screen.dart';
import '../features/digital_vault/vault_screen.dart';
import '../features/booking/booking_screen.dart';
import '../core/theme/app_theme.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> with TickerProviderStateMixin {
  int _index = 0;
  late final List<AnimationController> _iconAnims;

  static const _screens = [
    WorkerProfileScreen(),
    VaultScreen(),
    BookingScreen(),
  ];

  static const _destinations = [
    _NavItem(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Home'),
    _NavItem(icon: Icons.lock_outline_rounded, activeIcon: Icons.lock_rounded, label: 'Vault'),
    _NavItem(icon: Icons.calendar_month_outlined, activeIcon: Icons.calendar_month_rounded, label: 'Bookings'),
  ];

  @override
  void initState() {
    super.initState();
    _iconAnims = List.generate(
      _destinations.length,
      (i) => AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 300),
        value: i == 0 ? 1.0 : 0.0,
      ),
    );
  }

  @override
  void dispose() {
    for (final c in _iconAnims) {
      c.dispose();
    }
    super.dispose();
  }

  void _onDestinationSelected(int index) {
    if (index == _index) return;
    _iconAnims[_index].reverse();
    setState(() => _index = index);
    _iconAnims[index].forward();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: child),
        child: KeyedSubtree(
          key: ValueKey(_index),
          child: _screens[_index],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: AppColors.border, width: 1)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              children: List.generate(_destinations.length, (i) {
                final dest = _destinations[i];
                final selected = i == _index;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => _onDestinationSelected(i),
                    child: AnimatedBuilder(
                      animation: _iconAnims[i],
                      builder: (_, __) {
                        final t = _iconAnims[i].value;
                        return Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.primary.withValues(alpha: 0.1 * t)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Transform.scale(
                                scale: 1.0 + 0.1 * t,
                                child: Icon(
                                  selected ? dest.activeIcon : dest.icon,
                                  color: selected
                                      ? AppColors.primary
                                      : AppColors.textMuted,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                dest.label,
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                                  color: selected ? AppColors.primary : AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  const _NavItem({required this.icon, required this.activeIcon, required this.label});
  final IconData icon;
  final IconData activeIcon;
  final String label;
}
