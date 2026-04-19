import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_provider.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final myGrievancesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final resp = await dio.get('/grievances/my');
  return (resp.data['grievances'] as List)
      .map((e) => Map<String, dynamic>.from(e as Map))
      .toList();
});

// ── Screens ───────────────────────────────────────────────────────────────────

class GrievanceScreen extends ConsumerWidget {
  const GrievanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final grievances = ref.watch(myGrievancesProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Grievances'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Report a grievance',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const _ReportGrievanceScreen()),
            ).then((_) => ref.invalidate(myGrievancesProvider)),
          ),
        ],
      ),
      body: grievances.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) => list.isEmpty
            ? _EmptyState(
                onReport: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const _ReportGrievanceScreen()),
                ).then((_) => ref.invalidate(myGrievancesProvider)),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _GrievanceCard(grievance: list[i]),
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const _ReportGrievanceScreen()),
        ).then((_) => ref.invalidate(myGrievancesProvider)),
        icon: const Icon(Icons.report_problem_outlined),
        label: const Text('Report'),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onReport});
  final VoidCallback onReport;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.support_agent_outlined,
                size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No grievances yet',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(
              'Had an issue with a worker or booking?\nReport it and our team will look into it.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onReport,
              icon: const Icon(Icons.add),
              label: const Text('Report a Grievance'),
            ),
          ],
        ),
      ),
    );
  }
}

class _GrievanceCard extends StatelessWidget {
  const _GrievanceCard({required this.grievance});
  final Map<String, dynamic> grievance;

  @override
  Widget build(BuildContext context) {
    final status = grievance['status'] as String? ?? 'open';
    final isOpen = status == 'open';
    final adminNote = grievance['admin_note'] as String?;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    grievance['subject'] as String? ?? '',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isOpen ? Colors.orange.shade50 : Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: isOpen
                            ? Colors.orange.shade200
                            : Colors.green.shade200),
                  ),
                  child: Text(
                    isOpen ? 'Open' : 'Resolved',
                    style: TextStyle(
                        color: isOpen
                            ? Colors.orange.shade800
                            : Colors.green.shade800,
                        fontWeight: FontWeight.w600,
                        fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              grievance['description'] as String? ?? '',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
            ),
            if (adminNote != null && adminNote.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.shade100),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.admin_panel_settings_outlined,
                        size: 16, color: Colors.blue.shade700),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text('Admin: $adminNote',
                          style: TextStyle(
                              color: Colors.blue.shade800,
                              fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              _fmtDate(grievance['created_at'] as String? ?? ''),
              style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  String _fmtDate(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day}/${d.month}/${d.year}  ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}

// ── Report form ───────────────────────────────────────────────────────────────

class _ReportGrievanceScreen extends ConsumerStatefulWidget {
  const _ReportGrievanceScreen({this.workerId, this.bookingId});
  final String? workerId;
  final String? bookingId;

  @override
  ConsumerState<_ReportGrievanceScreen> createState() =>
      _ReportGrievanceScreenState();
}

class _ReportGrievanceScreenState
    extends ConsumerState<_ReportGrievanceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/grievances', data: {
        'subject': _subjectCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        if (widget.workerId != null) 'workerId': widget.workerId,
        if (widget.bookingId != null) 'bookingId': widget.bookingId,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Grievance submitted. We will review it shortly.'),
          backgroundColor: Colors.green,
        ));
        Navigator.pop(context);
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ??
          'Could not submit. Please try again.';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(msg), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Report a Grievance')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.orange.shade700),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Your grievance will be reviewed by our admin team within 24–48 hours.',
                      style: TextStyle(
                          color: Colors.orange.shade800, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('Subject', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            TextFormField(
              controller: _subjectCtrl,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'e.g. Worker did not show up',
              ),
              textCapitalization: TextCapitalization.sentences,
              validator: (v) {
                if (v == null || v.trim().length < 5) {
                  return 'Subject must be at least 5 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            Text('Description', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descCtrl,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText:
                    'Describe the issue in detail. The more detail you provide, the faster we can resolve it.',
                alignLabelWithHint: true,
              ),
              maxLines: 5,
              textCapitalization: TextCapitalization.sentences,
              validator: (v) {
                if (v == null || v.trim().length < 20) {
                  return 'Please provide at least 20 characters of detail';
                }
                return null;
              },
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: _loading ? null : _submit,
              icon: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send_outlined),
              label:
                  Text(_loading ? 'Submitting…' : 'Submit Grievance'),
              style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
