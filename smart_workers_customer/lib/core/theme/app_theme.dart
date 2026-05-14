import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // ignore: unused_import
import 'package:google_fonts/google_fonts.dart';

// ── Brand Colours ────────────────────────────────────────────────────────────
const kBrandDeep    = Color(0xFF0A0F1E); // near-black bg
const kBrandNavy    = Color(0xFF111827); // card bg
const kBrandBlue    = Color(0xFF3B82F6); // primary accent
const kBrandIndigo  = Color(0xFF6366F1); // secondary accent
const kBrandGlow    = Color(0xFF60A5FA); // glow / highlight
const kBrandSurface = Color(0xFF1F2937); // input fill
const kBrandBorder  = Color(0xFF374151); // subtle border
const kBrandMuted   = Color(0xFF6B7280); // placeholder / caption
const kBrandText    = Color(0xFFF9FAFB); // primary text
const kBrandSubtext = Color(0xFF9CA3AF); // secondary text
const kSuccess      = Color(0xFF10B981);
const kError        = Color(0xFFEF4444);

// ── Gradients ────────────────────────────────────────────────────────────────
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

// ── Theme ────────────────────────────────────────────────────────────────────
ThemeData buildAppTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: kBrandDeep,
    colorScheme: const ColorScheme.dark(
      primary: kBrandBlue,
      secondary: kBrandIndigo,
      surface: kBrandNavy,
      error: kError,
    ),
    textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
      bodyColor: kBrandText,
      displayColor: kBrandText,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kBrandSurface,
      hintStyle: TextStyle(color: kBrandMuted, fontSize: 14),
      labelStyle: TextStyle(color: kBrandSubtext),
      floatingLabelStyle: TextStyle(color: kBrandBlue),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: kBrandBorder, width: 1),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: kBrandBorder, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: kBrandBlue, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: kError, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: kError, width: 1.5),
      ),
    ),
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
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: kBrandNavy,
      indicatorColor: kBrandBlue.withValues(alpha: 0.15),
      height: 64,
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(WidgetState.selected) ? kBrandBlue : kBrandMuted,
          size: 24,
        ),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => GoogleFonts.inter(
          color: states.contains(WidgetState.selected) ? kBrandBlue : kBrandMuted,
          fontSize: 11,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w600
              : FontWeight.w400,
        ),
      ),
    ),
  );
}

// ── Shared Widgets ────────────────────────────────────────────────────────────

/// A gradient pill button that matches the brand.
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
    return SizedBox(
      height: 56,
      child: Material(
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: (isLoading || onPressed == null) ? null : onPressed,
          child: Ink(
            decoration: BoxDecoration(
              gradient: (isLoading || onPressed == null)
                  ? const LinearGradient(
                      colors: [Color(0xFF374151), Color(0xFF374151)])
                  : kBrandGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: isLoading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.5, color: Colors.white))
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (icon != null) ...[icon!, const SizedBox(width: 8)],
                        Text(label,
                            style: GoogleFonts.inter(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                                letterSpacing: 0.3)),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Secondary outlined button.
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
          foregroundColor: kBrandText,
          side: const BorderSide(color: kBrandBorder, width: 1.5),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.inter(
              fontWeight: FontWeight.w600, fontSize: 15),
        ),
        icon: icon ?? const SizedBox.shrink(),
        label: Text(label),
      ),
    );
  }
}

/// Branded styled text field wrapper.
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
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      validator: validator,
      inputFormatters: inputFormatters,
      textCapitalization: textCapitalization,
      maxLength: maxLength,
      autofocus: autofocus,
      textAlign: textAlign,
      style: style ??
          GoogleFonts.inter(color: kBrandText, fontSize: 15),
      readOnly: readOnly,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: prefixIcon,
        suffixIcon: suffixIcon,
        counterText: '',
      ),
    );
  }
}
