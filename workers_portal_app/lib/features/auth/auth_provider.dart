import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/constants/api_constants.dart';
import '../../core/utils/secure_storage_service.dart';

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
  final String? devOtp; // shown on OTP screen in dev mode

  bool get isAuthenticated => token != null;

  AuthState copyWith({
    bool? isLoading,
    String? token,
    Map<String, dynamic>? user,
    String? error,
    String? devOtp,
    bool clearError = false,
    bool clearDevOtp = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      token: token ?? this.token,
      user: user ?? this.user,
      error: clearError ? null : (error ?? this.error),
      devOtp: clearDevOtp ? null : (devOtp ?? this.devOtp),
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _api = ApiClient(
      baseUrl: ApiConstants.baseUrl,
      tokenProvider: () => state.token,
    );
    _restoreSession();
  }

  late final ApiClient _api;

  Dio get dio => _api.client;

  Future<void> _restoreSession() async {
    final token = await SecureStorageService.readToken();
    if (token != null) {
      state = state.copyWith(token: token);
    }
  }

  Future<String?> sendOtp(String email) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res = await _api.client.post('/auth/send-otp', data: {'email': email});
      state = state.copyWith(
        isLoading: false,
        devOtp: res.data['devOtp'] as String?,
      );
      return null;
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? 'Network error. Is the backend running?';
      state = state.copyWith(isLoading: false, error: msg);
      return msg;
    }
  }

  Future<({bool isNewUser, String? error})> verifyOtp(String email, String otp) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res = await _api.client.post('/auth/verify-otp', data: {'email': email, 'otp': otp});
      final token = res.data['token'] as String;
      await SecureStorageService.saveToken(token);
      state = state.copyWith(
        isLoading: false,
        token: token,
        user: Map<String, dynamic>.from(res.data['user'] as Map),
        clearDevOtp: true,
      );
      return (isNewUser: res.data['isNewUser'] == true, error: null);
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? 'Verification failed.';
      state = state.copyWith(isLoading: false, error: msg);
      return (isNewUser: false, error: msg);
    }
  }

  Future<String?> completeProfile(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res = await _api.client.post('/auth/complete-profile', data: data);
      state = state.copyWith(
        isLoading: false,
        user: Map<String, dynamic>.from(res.data['user'] as Map),
      );
      return null;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] as String? ?? 'Failed to save profile.';
      state = state.copyWith(isLoading: false, error: msg);
      return msg;
    }
  }

  Future<void> logout() async {
    await SecureStorageService.clearToken();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

/// Exposes the Dio client (with JWT token injected) to other providers/screens.
final dioProvider = Provider<Dio>((ref) {
  return ref.watch(authProvider.notifier).dio;
});
