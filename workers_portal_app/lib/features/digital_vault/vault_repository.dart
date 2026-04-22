import '../../core/api/api_client.dart';

class VaultRepository {
  VaultRepository(this.apiClient);

  final ApiClient apiClient;

  Future<void> requestUploadUrl() async {
    await Future<void>.delayed(const Duration(milliseconds: 1));
  }
}
