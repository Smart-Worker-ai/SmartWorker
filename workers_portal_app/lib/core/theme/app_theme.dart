import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const primary = Color(0xFF2563EB);
  static const primaryDark = Color(0xFF1D4ED8);
  static const primaryDeep = Color(0xFF0F172A);
  static const accent = Color(0xFFF59E0B);
  static const accentLight = Color(0xFFFEF3C7);
  static const success = Color(0xFF10B981);
  static const error = Color(0xFFEF4444);
  static const surface = Color(0xFFF8FAFF);
  static const card = Color(0xFFFFFFFF);
  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF64748B);
  static const textMuted = Color(0xFF94A3B8);
  static const border = Color(0xFFE2E8F0);
  static const gradientStart = Color(0xFF1E3A8A);
  static const gradientEnd = Color(0xFF312E81);

  // Dark mode
  static const darkSurface = Color(0xFF0F172A);
  static const darkCard = Color(0xFF1E293B);
  static const darkTextPrimary = Color(0xFFF1F5F9);
  static const darkTextSecondary = Color(0xFF94A3B8);
  static const darkBorder = Color(0xFF334155);
}

class AppTheme {
  static ThemeData get lightTheme => _buildTheme(Brightness.light);
  static ThemeData get darkTheme => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: brightness,
    ).copyWith(
      primary: AppColors.primary,
      secondary: AppColors.accent,
      surface: isDark ? AppColors.darkSurface : AppColors.surface,
      error: AppColors.error,
    );

    final textColor = isDark ? AppColors.darkTextPrimary : AppColors.textPrimary;
    final subTextColor = isDark ? AppColors.darkTextSecondary : AppColors.textSecondary;
    final bgColor = isDark ? AppColors.darkSurface : AppColors.surface;
    final cardColor = isDark ? AppColors.darkCard : AppColors.card;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.border;
    final inputFill = isDark ? AppColors.darkCard : Colors.white;

    return ThemeData(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: bgColor,
      useMaterial3: true,
      textTheme: GoogleFonts.interTextTheme(
        isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme,
      ).copyWith(
        displayLarge: GoogleFonts.inter(fontSize: 57, fontWeight: FontWeight.w800, color: textColor),
        headlineLarge: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: textColor),
        headlineMedium: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700, color: textColor),
        titleLarge: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: textColor),
        titleMedium: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: textColor),
        bodyLarge: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w400, color: textColor),
        bodyMedium: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w400, color: subTextColor),
        labelLarge: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: textColor),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: bgColor,
        foregroundColor: textColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
        titleTextStyle: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: textColor),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: BorderSide(color: borderColor, width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: inputFill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: borderColor, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: borderColor, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        labelStyle: GoogleFonts.inter(fontSize: 14, color: subTextColor),
        hintStyle: GoogleFonts.inter(fontSize: 14, color: isDark ? AppColors.darkTextSecondary : AppColors.textMuted),
      ),
      cardTheme: CardThemeData(
        color: cardColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: borderColor, width: 1),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: cardColor,
        indicatorColor: AppColors.primary.withValues(alpha: 0.12),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.primary, size: 24);
          }
          return IconThemeData(color: isDark ? AppColors.darkTextSecondary : AppColors.textMuted, size: 24);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary);
          }
          return GoogleFonts.inter(
            fontSize: 12, fontWeight: FontWeight.w500,
            color: isDark ? AppColors.darkTextSecondary : AppColors.textMuted,
          );
        }),
      ),
    );
  }
}

/// Malayalam translations
class AppStrings {
  static Map<String, Map<String, String>> strings = {
    'en': {
      'welcome': 'Smart\nWorkers',
      'tagline': "Kerala's #1 platform for skilled workers.\nBook trusted professionals instantly.",
      'getStarted': 'Get Started',
      'signIn': 'Sign in to existing account',
      'verifiedWorkers': 'Verified Workers',
      'instantBooking': 'Instant Booking',
      'securePayments': 'Secure Payments',
      'signInTitle': 'Sign In',
      'signInSubtitle': "We'll send a 6-digit OTP to your email\nand mobile number.",
      'email': 'Email Address',
      'mobile': 'Mobile Number',
      'sendOtp': 'Send OTP',
      'enterOtp': 'Enter OTP',
      'verifyAndContinue': 'Verify & Continue',
      'resendOtp': 'Resend OTP',
      'resendIn': 'Resend OTP in',
      'settings': 'Settings',
      'darkMode': 'Dark Mode',
      'language': 'Language',
      'english': 'English',
      'malayalam': 'മലയാളം',
      'logout': 'Logout',
    },
    'ml': {
      'welcome': 'സ്മാർട്ട്\nവർക്കേഴ്സ്',
      'tagline': 'കേരളത്തിലെ നമ്പർ 1 നൈപുണ്യ തൊഴിലാളി പ്ലാറ്റ്ഫോം.\nവിശ്വസ്ത പ്രൊഫഷണലുകളെ ഉടൻ ബുക്ക് ചെയ്യൂ.',
      'getStarted': 'ആരംഭിക്കുക',
      'signIn': 'നിലവിലുള്ള അക്കൗണ്ടിൽ സൈൻ ഇൻ ചെയ്യുക',
      'verifiedWorkers': 'പരിശോധിച്ച തൊഴിലാളികൾ',
      'instantBooking': 'ഉടൻ ബുക്കിംഗ്',
      'securePayments': 'സുരക്ഷിത പേയ്‌മെന്റ്',
      'signInTitle': 'സൈൻ ഇൻ',
      'signInSubtitle': 'നിങ്ങളുടെ ഇമെയിലിലേക്കും\nമൊബൈലിലേക്കും OTP അയക്കും.',
      'email': 'ഇമെയിൽ വിലാസം',
      'mobile': 'മൊബൈൽ നമ്പർ',
      'sendOtp': 'OTP അയക്കുക',
      'enterOtp': 'OTP നൽകുക',
      'verifyAndContinue': 'സ്ഥിരീകരിക്കുക',
      'resendOtp': 'OTP വീണ്ടും അയക്കുക',
      'resendIn': 'OTP അയക്കാൻ',
      'settings': 'ക്രമീകരണങ്ങൾ',
      'darkMode': 'ഡാർക്ക് മോഡ്',
      'language': 'ഭാഷ',
      'english': 'English',
      'malayalam': 'മലയാളം',
      'logout': 'ലോഗൗട്ട്',
    },
  };

  static String t(String key, String locale) {
    return strings[locale]?[key] ?? strings['en']![key] ?? key;
  }
}
