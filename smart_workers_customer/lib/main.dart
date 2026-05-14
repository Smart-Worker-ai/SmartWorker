import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/services/secure_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/welcome_screen.dart';
import 'shared/app_shell.dart';

// ── Global providers ──────────────────────────────────────────────────────────

final themeModeProvider = StateNotifierProvider<_ThemeModeNotifier, ThemeMode>(
  (_) => _ThemeModeNotifier(),
);

class _ThemeModeNotifier extends StateNotifier<ThemeMode> {
  _ThemeModeNotifier() : super(ThemeMode.dark) {
    _load();
  }
  Future<void> _load() async {
    final stored = await SecureStorageService.read('themeMode');
    if (stored == 'light') state = ThemeMode.light;
  }
  Future<void> toggle() async {
    state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await SecureStorageService.write('themeMode', state == ThemeMode.dark ? 'dark' : 'light');
  }
}

final localeModeProvider = StateNotifierProvider<_LocaleNotifier, Locale>(
  (_) => _LocaleNotifier(),
);

class _LocaleNotifier extends StateNotifier<Locale> {
  _LocaleNotifier() : super(const Locale('en')) {
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
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  runApp(const ProviderScope(child: CustomerApp()));
}

class CustomerApp extends ConsumerWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeModeProvider);
    return MaterialApp(
      title: 'SmartWorkers',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      darkTheme: buildAppTheme(),
      themeMode: themeMode,
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('ml')],
      localizationsDelegates: const [
        DefaultMaterialLocalizations.delegate,
        DefaultWidgetsLocalizations.delegate,
      ],
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
        backgroundColor: kBrandDeep,
        body: Center(child: SizedBox(
          width: 36, height: 36,
          child: CircularProgressIndicator(
            strokeWidth: 2.5,
            color: kBrandBlue,
          ),
        )),
      ),
      error: (_, __) => const WelcomeScreen(),
      data: (loggedIn) => loggedIn ? const AppShell() : const WelcomeScreen(),
    );
  }
}
