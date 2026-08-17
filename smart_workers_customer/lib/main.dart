import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/services/secure_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/app_colors.dart';
import 'features/auth/welcome_screen.dart';
import 'shared/app_shell.dart';

// ── Global providers ──────────────────────────────────────────────────────────

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>(
  (_) => ThemeModeNotifier(),
);

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.dark) {
    _load();
  }
  Future<void> _load() async {
    final stored = await SecureStorageService.read('themeMode');
    if (stored == 'light') state = ThemeMode.light;
    else if (stored == 'system') state = ThemeMode.system;
  }
  Future<void> toggle() async {
    state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await SecureStorageService.write('themeMode', state == ThemeMode.dark ? 'dark' : 'light');
  }
  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await SecureStorageService.write('themeMode', switch (mode) {
      ThemeMode.dark   => 'dark',
      ThemeMode.light  => 'light',
      ThemeMode.system => 'system',
    });
  }
}

final localeModeProvider = StateNotifierProvider<LocaleNotifier, Locale>(
  (_) => LocaleNotifier(),
);

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(const Locale('en')) {
    _load();
  }
  Future<void> _load() async {
    final stored = await SecureStorageService.read('locale');
    if (stored == 'ml') state = const Locale('ml');
  }
  Future<void> setLocale(Locale locale) async {
    state = locale;
    await SecureStorageService.write('locale', locale.languageCode);
  }
}

final _sessionProvider = FutureProvider<bool>((ref) async {
  final token = await SecureStorageService.readToken();
  return token != null;
});

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const ProviderScope(child: CustomerApp()));
}

class CustomerApp extends ConsumerWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeModeProvider);
    final isDark = themeMode == ThemeMode.dark ||
        (themeMode == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);
    // Drive system bars from the theme so light mode gets dark icons.
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
    ));
    return MaterialApp(
      title: 'HAYAKU',
      debugShowCheckedModeBanner: false,
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: themeMode,
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('ml')],
      localizationsDelegates: const [
        DefaultMaterialLocalizations.delegate,
        DefaultWidgetsLocalizations.delegate,
      ],
      builder: (ctx, child) => AnimatedTheme(
        data: Theme.of(ctx),
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
        child: child ?? const SizedBox.shrink(),
      ),
      home: const _AuthGate(),
    );
  }
}

class _AuthGate extends ConsumerWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(_sessionProvider);
    return session.when(
      loading: () => Scaffold(
        backgroundColor: context.c.bgDeep,
        body: Center(
          child: SizedBox(
            width: 36, height: 36,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: context.c.accent),
          ),
        ),
      ),
      error: (_, __) => const WelcomeScreen(),
      data: (loggedIn) => loggedIn ? const AppShell() : const WelcomeScreen(),
    );
  }
}
