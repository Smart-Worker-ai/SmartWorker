import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _tokenKey = 'jwt_token';
  static const _userKey = 'user_json';

  static Future<void> writeToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  static Future<String?> readToken() => _storage.read(key: _tokenKey);

  static Future<void> writeUser(String userJson) =>
      _storage.write(key: _userKey, value: userJson);

  static Future<String?> readUser() => _storage.read(key: _userKey);

  static Future<void> clear() => _storage.deleteAll();
}
