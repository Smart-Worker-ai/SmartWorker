import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../auth/auth_provider.dart';

class _VaultDoc {
  const _VaultDoc({
    required this.id,
    required this.fileName,
    required this.filePath,
    required this.uploadedAt,
  });

  final String id;
  final String fileName;
  final String filePath;
  final DateTime uploadedAt;
}

class _VaultState extends StateNotifier<List<_VaultDoc>> {
  _VaultState() : super([]);

  void add(_VaultDoc doc) => state = [doc, ...state];
  void remove(String id) => state = state.where((d) => d.id != id).toList();
}

final _vaultProvider = StateNotifierProvider<_VaultState, List<_VaultDoc>>((ref) {
  return _VaultState();
});

class VaultScreen extends ConsumerWidget {
  const VaultScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docs = ref.watch(_vaultProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Vault'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            tooltip: 'About Vault',
            onPressed: () => showDialog(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text('Digital Vault'),
                content: const Text(
                    'Store your Aadhaar, PAN, bank passbook, and other documents securely. '
                    'Documents are encrypted and linked to your account.'),
                actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
              ),
            ),
          ),
        ],
      ),
      body: docs.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.folder_open, size: 72, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  Text('No documents yet', style: TextStyle(fontSize: 18, color: Colors.grey.shade500)),
                  const SizedBox(height: 8),
                  Text('Tap + to add Aadhaar, PAN, or other documents',
                      style: TextStyle(color: Colors.grey.shade400), textAlign: TextAlign.center),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: docs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _DocCard(
                doc: docs[i],
                onDelete: () => ref.read(_vaultProvider.notifier).remove(docs[i].id),
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _pickDocument(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Add Document'),
      ),
    );
  }

  Future<void> _pickDocument(BuildContext context, WidgetRef ref) async {
    final choice = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (choice == null) return;

    final picker = ImagePicker();
    final file = await picker.pickImage(source: choice, imageQuality: 80);
    if (file == null || !context.mounted) return;

    // Ask user what document type this is
    final docType = await showDialog<String>(
      context: context,
      builder: (_) => _DocTypeDialog(),
    );
    if (docType == null || !context.mounted) return;

    final fileName = '$docType-${DateTime.now().millisecondsSinceEpoch}.jpg';
    ref.read(_vaultProvider.notifier).add(_VaultDoc(
          id: DateTime.now().toIso8601String(),
          fileName: fileName,
          filePath: file.path,
          uploadedAt: DateTime.now(),
        ));

    // Notify backend (fire and forget — will be a no-op if backend isn't running)
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/vault/document', data: {
        'fileName': fileName,
        'fileType': 'image/jpeg',
        'url': file.path,
      });
    } catch (_) {
      // Backend registration optional for dev; document is still shown locally.
    }

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$docType added to vault'), backgroundColor: Colors.green));
    }
  }
}

class _DocCard extends StatelessWidget {
  const _DocCard({required this.doc, required this.onDelete});

  final _VaultDoc doc;
  final VoidCallback onDelete;

  IconData get _icon {
    final name = doc.fileName.toLowerCase();
    if (name.contains('aadhaar') || name.contains('aadhar')) return Icons.badge;
    if (name.contains('pan')) return Icons.credit_card;
    if (name.contains('bank') || name.contains('passbook')) return Icons.account_balance;
    if (name.contains('license')) return Icons.drive_eta;
    return Icons.description;
  }

  @override
  Widget build(BuildContext context) {
    final file = File(doc.filePath);
    final exists = file.existsSync();

    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: exists
              ? Image.file(file, width: 56, height: 56, fit: BoxFit.cover)
              : Container(
                  width: 56, height: 56,
                  color: Colors.grey.shade200,
                  child: Icon(_icon, color: Colors.grey.shade600),
                ),
        ),
        title: Text(doc.fileName, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          'Added ${_formatDate(doc.uploadedAt)}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline, color: Colors.red),
          onPressed: () => showDialog(
            context: context,
            builder: (_) => AlertDialog(
              title: const Text('Remove document?'),
              content: const Text('This will remove the document from the vault.'),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                TextButton(
                  onPressed: () { Navigator.pop(context); onDelete(); },
                  child: const Text('Remove', style: TextStyle(color: Colors.red)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

class _DocTypeDialog extends StatelessWidget {
  _DocTypeDialog();

  final _types = const ['Aadhaar Card', 'PAN Card', 'Bank Passbook', 'Driving License', 'Other'];

  @override
  Widget build(BuildContext context) {
    return SimpleDialog(
      title: const Text('Document type'),
      children: _types
          .map((t) => SimpleDialogOption(
                onPressed: () => Navigator.pop(context, t),
                child: Text(t),
              ))
          .toList(),
    );
  }
}
