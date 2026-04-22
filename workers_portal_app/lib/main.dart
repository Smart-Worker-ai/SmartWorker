import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/secure_storage_service.dart';
import 'features/auth/welcome_screen.dart';
import 'shared/app_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  _wakeBackend(); // fire-and-forget to prevent Railway cold-start OTP delay

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint(details.exceptionAsString());
  };

  runZonedGuarded(() {
    runApp(const ProviderScope(child: WorkersPortalApp()));
  }, (error, stackTrace) {
    debugPrint('Unhandled app error: $error');
    debugPrintStack(stackTrace: stackTrace);
  });
}

void _wakeBackend() async {
  try {
    final dio = Dio()
      ..options.connectTimeout = const Duration(seconds: 35)
      ..options.receiveTimeout = const Duration(seconds: 35);
    await dio.get('https://smart-workers-backend-production.up.railway.app/api/v1/health');
  } catch (_) {}
}

final _sessionProvider = FutureProvider<bool>((ref) async {
  final token = await SecureStorageService.readToken();
  return token != null;
});

final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.light);

class WorkersPortalApp extends ConsumerWidget {
  const WorkersPortalApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(_sessionProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Smart Workers',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      locale: ref.watch(localeModeProvider),
      supportedLocales: const [Locale('en'), Locale('ml')],
      localizationsDelegates: const [
        DefaultMaterialLocalizations.delegate,
        DefaultWidgetsLocalizations.delegate,
      ],
      home: session.when(
        loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
        error: (_, __) => const WelcomeScreen(),
        data: (loggedIn) => loggedIn ? const AppShell() : const WelcomeScreen(),
      ),
    );
  }
}

final localeModeProvider = StateProvider<Locale>((ref) => const Locale('en'));
