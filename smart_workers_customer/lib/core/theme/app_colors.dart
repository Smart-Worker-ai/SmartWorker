import 'package:flutter/material.dart';

/// Theme-aware color tokens. Use via `context.c.bgDeep`, `context.c.text` etc.
///
/// Keeps the API tight: one accessor (`context.c`) returns a struct of
/// colors/gradients picked from the current `Theme.of(context).brightness`.
extension AppColorsX on BuildContext {
  AppPalette get c => AppPalette._(Theme.of(this).brightness == Brightness.dark);
}

class AppPalette {
  const AppPalette._(this.isDark);
  final bool isDark;

  // Backgrounds
  Color get bgDeep    => isDark ? const Color(0xFF0A0F1E) : const Color(0xFFF7F9FC);
  Color get bgNavy    => isDark ? const Color(0xFF111827) : Colors.white;
  Color get surface   => isDark ? const Color(0xFF1F2937) : const Color(0xFFF1F5F9);
  Color get border    => isDark ? const Color(0xFF374151) : const Color(0xFFE2E8F0);

  // Text
  Color get text      => isDark ? const Color(0xFFF9FAFB) : const Color(0xFF0F172A);
  Color get subtext   => isDark ? const Color(0xFF9CA3AF) : const Color(0xFF475569);
  Color get muted     => isDark ? const Color(0xFF6B7280) : const Color(0xFF94A3B8);

  // Brand (same in both themes — accents)
  Color get accent          => const Color(0xFF3B82F6);
  Color get accentSecondary => const Color(0xFF6366F1);
  Color get glow            => const Color(0xFF60A5FA);
  Color get success         => const Color(0xFF10B981);
  Color get error           => const Color(0xFFEF4444);

  // Gradients
  LinearGradient get bgGradient => isDark
      ? const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF0D1117), Color(0xFF0A0F1E)],
        )
      : const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFFFFF), Color(0xFFF1F5F9)],
        );

  LinearGradient get brandGradient => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
      );

  // Convenience opacities
  Color get scrim => isDark ? Colors.black.withValues(alpha: 0.5) : Colors.black.withValues(alpha: 0.25);
}
