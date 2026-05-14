import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

// ──────────────────────────────────────────────────────────────────────────────
// LEGACY COLOR CONSTANTS — kept for backward compat with non-auth screens that
// haven't been migrated to `context.c.*` yet. Prefer `context.c.bgDeep` etc.
// ──────────────────────────────────────────────────────────────────────────────
const kBrandDeep    = Color(0xFF0A0F1E);
const kBrandNavy    = Color(0xFF111827);
const kBrandBlue    = Color(0xFF3B82F6);
const kBrandIndigo  = Color(0xFF6366F1);
const kBrandGlow    = Color(0xFF60A5FA);
const kBrandSurface = Color(0xFF1F2937);
const kBrandBorder  = Color(0xFF374151);
const kBrandMuted   = Color(0xFF6B7280);
const kBrandText    = Color(0xFFF9FAFB);
const kBrandSubtext = Color(0xFF9CA3AF);
const kSuccess      = Color(0xFF10B981);
const kError        = Color(0xFFEF4444);

const kBrandGradient = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
);

const kBgGradient = LinearGradient(
  begin: Alignment.topCenter,
  end: Alignment.bottomCenter,
  colors: [Color(0xFF0D1117), Color(0xFF0A0F1E)],
);

// ──────────────────────────────────────────────────────────────────────────────
// THEMES
// ──────────────────────────────────────────────────────────────────────────────

ThemeData buildDarkTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  return _common(base, isDark: true).copyWith(
    scaffoldBackgroundColor: kBrandDeep,
    colorScheme: const ColorScheme.dark(
      primary: kBrandBlue,
      secondary: kBrandIndigo,
      surface: kBrandNavy,
      error: kError,
    ),
    inputDecorationTheme: _inputDecorationTheme(
      fill: kBrandSurface,
      hint: kBrandMuted,
      label: kBrandSubtext,
      border: kBrandBorder,
      focusBorder: kBrandBlue,
      errorBorder: kError,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: kBrandNavy,
      indicatorColor: kBrandBlue.withValues(alpha: 0.15),
      height: 64,
      iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(
            color: s.contains(WidgetState.selected) ? kBrandBlue : kBrandMuted,
            size: 24,
          )),
      labelTextStyle: WidgetStateProperty.resolveWith((s) => GoogleFonts.inter(
            color: s.contains(WidgetState.selected) ? kBrandBlue : kBrandMuted,
            fontSize: 11,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w400,
          )),
    ),
  );
}

ThemeData buildLightTheme() {
  const lightBg      = Color(0xFFF7F9FC);
  const lightSurface = Color(0xFFF1F5F9);
  const lightCard    = Colors.white;
  const lightBorder  = Color(0xFFE2E8F0);
  const lightText    = Color(0xFF0F172A);
  const lightSubtext = Color(0xFF475569);
  const lightMuted   = Color(0xFF94A3B8);

  final base = ThemeData.light(useMaterial3: true);
  return _common(base, isDark: false).copyWith(
    scaffoldBackgroundColor: lightBg,
    colorScheme: const ColorScheme.light(
      primary: kBrandBlue,
      secondary: kBrandIndigo,
      surface: lightCard,
      error: kError,
    ),
    textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: lightText,
      displayColor: lightText,
    ),
    inputDecorationTheme: _inputDecorationTheme(
      fill: lightSurface,
      hint: lightMuted,
      label: lightSubtext,
      border: lightBorder,
      focusBorder: kBrandBlue,
      errorBorder: kError,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: lightCard,
      indicatorColor: kBrandBlue.withValues(alpha: 0.12),
      height: 64,
      iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(
            color: s.contains(WidgetState.selected) ? kBrandBlue : lightMuted,
            size: 24,
          )),
      labelTextStyle: WidgetStateProperty.resolveWith((s) => GoogleFonts.inter(
            color: s.contains(WidgetState.selected) ? kBrandBlue : lightMuted,
            fontSize: 11,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w400,
          )),
    ),
  );
}

ThemeData _common(ThemeData base, {required bool isDark}) {
  final textColor = isDark ? kBrandText : const Color(0xFF0F172A);
  return base.copyWith(
    textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: textColor,
      displayColor: textColor,
    ),
    pageTransitionsTheme: const PageTransitionsTheme(builders: {
      TargetPlatform.android: _SmoothPageTransitionsBuilder(),
      TargetPlatform.iOS:     CupertinoPageTransitionsBuilder(),
    }),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        padding: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        elevation: 0,
        textStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w700, fontSize: 16, letterSpacing: 0.3),
      ),
    ),
    splashFactory: InkSparkle.splashFactory,
  );
}

InputDecorationTheme _inputDecorationTheme({
  required Color fill,
  required Color hint,
  required Color label,
  required Color border,
  required Color focusBorder,
  required Color errorBorder,
}) =>
    InputDecorationTheme(
      filled: true,
      fillColor: fill,
      hintStyle: TextStyle(color: hint, fontSize: 14),
      labelStyle: TextStyle(color: label),
      floatingLabelStyle: TextStyle(color: focusBorder),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: border, width: 1),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: border, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: focusBorder, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: errorBorder, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: errorBorder, width: 1.5),
      ),
    );

/// Cubic slide+fade for default page transitions (replaces Android's default zoom).
class _SmoothPageTransitionsBuilder extends PageTransitionsBuilder {
  const _SmoothPageTransitionsBuilder();
  @override
  Widget buildTransitions<T>(PageRoute<T> route, BuildContext ctx,
      Animation<double> anim, Animation<double> sec, Widget child) {
    final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic, reverseCurve: Curves.easeInCubic);
    return SlideTransition(
      position: Tween(begin: const Offset(0.06, 0), end: Offset.zero).animate(curved),
      child: FadeTransition(opacity: curved, child: child),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared brand buttons (theme-aware where it matters)
// ──────────────────────────────────────────────────────────────────────────────

class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final disabled = isLoading || onPressed == null;
    return SizedBox(
      height: 56,
      child: Material(
        borderRadius: BorderRadius.circular(14),
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: disabled ? null : onPressed,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            decoration: BoxDecoration(
              gradient: disabled
                  ? const LinearGradient(colors: [Color(0xFF6B7280), Color(0xFF6B7280)])
                  : kBrandGradient,
              borderRadius: BorderRadius.circular(14),
              boxShadow: disabled
                  ? null
                  : [
                      BoxShadow(
                        color: kBrandBlue.withValues(alpha: 0.35),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
            ),
            child: Center(
              child: isLoading
                  ? const SizedBox(
                      width: 22, height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (icon != null) ...[icon!, const SizedBox(width: 8)],
                        Text(label,
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                              letterSpacing: 0.3,
                            )),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class OutlineGhostButton extends StatelessWidget {
  const OutlineGhostButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });
  final String label;
  final VoidCallback? onPressed;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: Theme.of(context).textTheme.bodyLarge?.color,
          side: BorderSide(color: Theme.of(context).dividerColor, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15),
        ),
        icon: icon ?? const SizedBox.shrink(),
        label: Text(label),
      ),
    );
  }
}

class BrandTextField extends StatelessWidget {
  const BrandTextField({
    super.key,
    required this.controller,
    required this.label,
    this.hint,
    this.prefixIcon,
    this.suffixIcon,
    this.keyboardType,
    this.obscureText = false,
    this.validator,
    this.inputFormatters,
    this.textCapitalization = TextCapitalization.none,
    this.maxLength,
    this.autofocus = false,
    this.textAlign = TextAlign.start,
    this.style,
    this.onChanged,
    this.readOnly = false,
  });
  final TextEditingController controller;
  final String label;
  final String? hint;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final TextInputType? keyboardType;
  final bool obscureText;
  final String? Function(String?)? validator;
  final List<TextInputFormatter>? inputFormatters;
  final TextCapitalization textCapitalization;
  final int? maxLength;
  final bool autofocus;
  final TextAlign textAlign;
  final TextStyle? style;
  final void Function(String)? onChanged;
  final bool readOnly;

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscureText,
        validator: validator,
        inputFormatters: inputFormatters,
        textCapitalization: textCapitalization,
        maxLength: maxLength,
        autofocus: autofocus,
        textAlign: textAlign,
        readOnly: readOnly,
        onChanged: onChanged,
        style: style ?? GoogleFonts.inter(fontSize: 15),
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: prefixIcon,
          suffixIcon: suffixIcon,
          counterText: '',
        ),
      );
}
