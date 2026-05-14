import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';

/// Theme-aware back button used across auth flow.
class BackBtn extends StatelessWidget {
  const BackBtn({super.key, this.onTap});
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap ?? () => Navigator.maybePop(context),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: c.border),
          ),
          child: Icon(Icons.arrow_back_ios_new_rounded, color: c.text, size: 18),
        ),
      ),
    );
  }
}

/// Smooth slide-from-right page route (used everywhere in auth flow).
PageRoute<T> slideRoute<T>(Widget page, {Duration duration = const Duration(milliseconds: 320)}) =>
    PageRouteBuilder<T>(
      pageBuilder: (_, __, ___) => page,
      transitionDuration: duration,
      reverseTransitionDuration: duration,
      transitionsBuilder: (_, anim, __, child) {
        final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic, reverseCurve: Curves.easeInCubic);
        return SlideTransition(
          position: Tween(begin: const Offset(1, 0), end: Offset.zero).animate(curved),
          child: FadeTransition(opacity: curved, child: child),
        );
      },
    );

/// Cross-fade page route — used for final post-login navigation.
PageRoute<T> fadeRoute<T>(Widget page) => PageRouteBuilder<T>(
      pageBuilder: (_, __, ___) => page,
      transitionDuration: const Duration(milliseconds: 380),
      transitionsBuilder: (_, anim, __, child) =>
          FadeTransition(opacity: anim, child: child),
    );

/// Branded snackbar. `kind` controls color: success / error / info.
enum SnackKind { success, error, info }

void showAppSnack(BuildContext context, String msg, {SnackKind kind = SnackKind.error}) {
  final c = context.c;
  final color = switch (kind) {
    SnackKind.success => c.success,
    SnackKind.error   => c.error,
    SnackKind.info    => c.accent,
  };
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(msg,
        style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w500)),
    backgroundColor: color,
    behavior: SnackBarBehavior.floating,
    margin: const EdgeInsets.all(16),
    duration: const Duration(seconds: 3),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  ));
}
