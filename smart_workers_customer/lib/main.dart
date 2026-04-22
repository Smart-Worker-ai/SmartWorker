import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/services/secure_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/welcome_screen.dart';
import 'shared/app_shell.dart';

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

class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartWorkers',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
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
