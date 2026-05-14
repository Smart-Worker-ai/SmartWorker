import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/services/secure_storage_service.dart';

// ── State ─────────────────────────────────────────────────────────────────────

class AuthState {
  const AuthState({
    this.isLoading = false,
    this.token,
    this.user,
    this.error,
    this.devOtp,
  });

  final bool isLoading;
  final String? token;
  final Map<String, dynamic>? user;
  final String? error;
  final String? devOtp;

  AuthState copyWith({
    bool? isLoading,
    String? token,
    Map<String, dynamic>? user,
    String? error,
    String? devOtp,
    bool clearError = false,
    bool clearDevOtp = false,
    bool clearToken = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      token: clearToken ? null : (token ?? this.token),
      user: user ?? this.user,
      error: clearError ? null : (error ?? this.error),
      devOtp: clearDevOtp ? null : (devOtp ?? this.devOtp),
    );
  }
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _apiClient = ApiClient(tokenProvider: () => state.token);
    _restoreSession();
  }

  late final ApiClient _apiClient;
  Dio get dio => _apiClient.dio;

  Future<void> _restoreSession() async {
    final token = await SecureStorageService.readToken();
    if (token == null) return;
    final userJson = await SecureStorageService.readUser();
    Map<String, dynamic>? user;
    if (userJson != null) {
      try {
        user = jsonDecode(userJson) as Map<String, dynamic>;
      } catch (_) {}
    }
    state = state.copyWith(token: token, user: user);
  }

  Future<String?> sendOtp(String phone) async {
    state = state.copyWith(isLoading: true, clearError: true, clearDevOtp: true);
    try {
      final resp = await _apiClient.dio.post('/auth/send-otp', data: {'phone': phone});
      final devOtp = resp.data['devOtp'] as String?;
      state = state.copyWith(isLoading: false, devOtp: devOtp);
      return null;
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? 'Could not send OTP. Check your connection.';
      state = state.copyWith(isLoading: false, error: msg);
      return msg;
    }
  }

  Future<({bool isNewUser, String? error})> verifyOtp(String phone, String otp) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final resp = await _apiClient.dio
          .post('/auth/verify-otp', data: {'phone': phone, 'otp': otp});
      final token = resp.data['token'] as String;
      final isNewUser = resp.data['isNewUser'] as bool? ?? false;
      final user = resp.data['user'] as Map<String, dynamic>?;
      await SecureStorageService.writeToken(token);
      if (user != null) await SecureStorageService.writeUser(jsonEncode(user));
      state = state.copyWith(isLoading: false, token: token, user: user);
      return (isNewUser: isNewUser, error: null);
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? 'Invalid OTP.';
      state = state.copyWith(isLoading: false, error: msg);
      return (isNewUser: false, error: msg);
    }
  }

  Future<String?> completeProfile(String name, {int? avatarColorIndex}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final resp = await _apiClient.dio.post('/auth/complete-profile', data: {
        'name': name,
        'role': 'customer',
        if (avatarColorIndex != null) 'avatarColorIndex': avatarColorIndex,
      });
      final user = resp.data['user'] as Map<String, dynamic>?;
      if (user != null) {
        await SecureStorageService.writeUser(jsonEncode(user));
        state = state.copyWith(isLoading: false, user: user);
      } else {
        state = state.copyWith(isLoading: false);
      }
      return null;
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? 'Could not save profile.';
      state = state.copyWith(isLoading: false, error: msg);
      return msg;
    }
  }

  Future<({bool isNewUser, String? error})> emailRegister(
      String email, String password, String name) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final resp = await _apiClient.dio.post('/auth/register-email',
          data: {'email': email, 'password': password, 'name': name});
      final token = resp.data['token'] as String;
      final user = resp.data['user'] as Map<String, dynamic>?;
      await SecureStorageService.writeToken(token);
      if (user != null) await SecureStorageService.writeUser(jsonEncode(user));
      state = state.copyWith(isLoading: false, token: token, user: user);
      return (isNewUser: true, error: null);
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? e.response?.data?['message'] as String? ?? 'Registration failed.';
      state = state.copyWith(isLoading: false, error: msg);
      return (isNewUser: false, error: msg);
    }
  }

  Future<String?> emailLogin(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final resp = await _apiClient.dio
          .post('/auth/login-email', data: {'email': email, 'password': password});
      final token = resp.data['token'] as String;
      final user = resp.data['user'] as Map<String, dynamic>?;
      await SecureStorageService.writeToken(token);
      if (user != null) await SecureStorageService.writeUser(jsonEncode(user));
      state = state.copyWith(isLoading: false, token: token, user: user);
      return null;
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? e.response?.data?['message'] as String? ?? 'Login failed. Check your credentials.';
      state = state.copyWith(isLoading: false, error: msg);
      return msg;
    }
  }

  /// Called after Firebase verifies the phone OTP.
  /// Signs in with Firebase, gets the ID token, then exchanges it for an app JWT.
  Future<({bool isNewUser, String? error})> signInWithFirebaseCredential(
      PhoneAuthCredential credential) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      // 1. Sign in with Firebase
      final userCredential =
          await FirebaseAuth.instance.signInWithCredential(credential);
      final idToken = await userCredential.user?.getIdToken();
      if (idToken == null) {
        state = state.copyWith(isLoading: false);
        return (isNewUser: false, error: 'Could not get Firebase token.');
      }

      // 2. Exchange Firebase token for app JWT
      final resp = await _apiClient.dio
          .post('/auth/verify-firebase-phone', data: {'idToken': idToken});
      final token = resp.data['token'] as String;
      final isNewUser = resp.data['isNewUser'] as bool? ?? false;
      final user = resp.data['user'] as Map<String, dynamic>?;

      await SecureStorageService.writeToken(token);
      if (user != null) await SecureStorageService.writeUser(jsonEncode(user));
      state = state.copyWith(isLoading: false, token: token, user: user);
      return (isNewUser: isNewUser, error: null);
    } on FirebaseAuthException catch (e) {
      final msg = switch (e.code) {
        'invalid-verification-code' => 'Incorrect OTP. Please try again.',
        'session-expired'           => 'OTP expired. Please request a new one.',
        _                           => e.message ?? 'Verification failed.',
      };
      state = state.copyWith(isLoading: false, error: msg);
      return (isNewUser: false, error: msg);
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? e.response?.data?['message'] as String? ?? 'Server error. Try again.';
      state = state.copyWith(isLoading: false, error: msg);
      return (isNewUser: false, error: msg);
    }
  }

  Future<void> logout() async {
    await FirebaseAuth.instance.signOut();
    await SecureStorageService.clear();
    state = const AuthState();
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (_) => AuthNotifier(),
);

final dioProvider = Provider<Dio>((ref) {
  return ref.watch(authProvider.notifier).dio;
});
