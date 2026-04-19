import 'package:dio/dio.dart';
import '../constants/api_constants.dart';

class ApiClient {
  ApiClient({String? Function()? tokenProvider}) {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    if (tokenProvider != null) {
      _dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = tokenProvider();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ));
    }
  }

  late final Dio _dio;
  Dio get dio => _dio;
}
