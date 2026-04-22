import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/secure_storage_service.dart';
import 'features/auth/welcome_screen.dart';
import 'shared/app_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

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

/// Checks SecureStorage once at startup to decide the initial route.
final _sessionProvider = FutureProvider<bool>((ref) async {
  final token = await SecureStorageService.readToken();
  return token != null;
});

class WorkersPortalApp extends ConsumerWidget {
  const WorkersPortalApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(_sessionProvider);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Smart Workers',
      theme: AppTheme.lightTheme,
      home: session.when(
        loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
        error: (_, __) => const WelcomeScreen(),
        data: (loggedIn) => loggedIn ? const AppShell() : const WelcomeScreen(),
      ),
    );
  }
}
