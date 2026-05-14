import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  SecureStorageService._();

  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static Future<void> saveToken(String token) {
    return _storage.write(key: 'jwt_token', value: token);
  }

  static Future<String?> readToken() {
    return _storage.read(key: 'jwt_token');
  }

  static Future<void> clearToken() {
    return _storage.delete(key: 'jwt_token');
  }

  static Future<String?> read(String key) => _storage.read(key: key);
  static Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);
}
