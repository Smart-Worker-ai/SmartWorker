import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../booking/booking_provider.dart';
import '../search/search_screen.dart';

class MyBookingsScreen extends ConsumerWidget {
  const MyBookingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsAsync = ref.watch(myBookingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Bookings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(myBookingsProvider),
          ),
        ],
      ),
      body: bookingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => _Empty(onSearch: () => _goSearch(context)),
        data: (bookings) => bookings.isEmpty
            ? _Empty(onSearch: () => _goSearch(context))
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: bookings.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _BookingCard(
                  booking: bookings[i],
                  onFeedback: () => _showFeedback(context, ref, bookings[i]),
                ),
              ),
      ),
    );
  }

  void _goSearch(BuildContext context) {
    Navigator.push(
        context, MaterialPageRoute(builder: (_) => const SearchScreen()));
  }

  void _showFeedback(
      BuildContext ctx, WidgetRef ref, Map<String, dynamic> booking) {
    int stars = 0;
    final commentCtrl = TextEditingController();
    final status = booking['status'] as String? ?? '';
    if (status != 'completed') {
      ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
          content: Text('Feedback is available once the booking is completed.')));
      return;
    }

    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Rate ${booking['workerName']}',
                style: const TextStyle(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            StatefulBuilder(
              builder: (c, setSt) => Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  5,
                  (i) => IconButton(
                    icon: Icon(
                      i < stars ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 40,
                    ),
                    onPressed: () => setSt(() => stars = i + 1),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: commentCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Comment (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () async {
                if (stars == 0) return;
                Navigator.pop(ctx);
                final err = await ref
                    .read(bookingProvider.notifier)
                    .submitFeedback(
                      booking['workerId'] as String,
                      booking['id'] as String,
                      stars,
                      commentCtrl.text.trim(),
                    );
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(
                    content: Text(err ?? 'Thank you for your feedback!'),
                    backgroundColor: err != null ? Colors.red : Colors.green,
                  ));
                }
              },
              child: const Text('Submit Rating'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _Empty extends StatelessWidget {
  const _Empty({required this.onSearch});
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.handyman_outlined,
                size: 72, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No bookings yet',
                style: theme.textTheme.titleLarge
                    ?.copyWith(color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            Text(
              'Book a skilled worker for any home service.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: Colors.grey),
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: onSearch,
              icon: const Icon(Icons.search),
              label: const Text('Find a Worker'),
              style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 28, vertical: 14)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Booking card ──────────────────────────────────────────────────────────────

class _BookingCard extends StatelessWidget {
  const _BookingCard({required this.booking, required this.onFeedback});
  final Map<String, dynamic> booking;
  final VoidCallback onFeedback;

  Color _statusColor(String s) => switch (s) {
        'confirmed' => Colors.green,
        'cancelled' => Colors.red,
        'completed' => Colors.blue,
        _ => Colors.orange,
      };

  IconData _statusIcon(String s) => switch (s) {
        'confirmed' => Icons.check_circle,
        'cancelled' => Icons.cancel,
        'completed' => Icons.task_alt,
        _ => Icons.hourglass_top,
      };

  @override
  Widget build(BuildContext context) {
    final status = booking['status'] as String? ?? 'pending';
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(booking['workerName'] as String? ?? '',
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 16)),
                      Text(booking['jobType'] as String? ?? '',
                          style: TextStyle(
                              color: theme.colorScheme.secondary,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor(status).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: _statusColor(status).withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_statusIcon(status),
                          size: 13, color: _statusColor(status)),
                      const SizedBox(width: 4),
                      Text(
                        status[0].toUpperCase() + status.substring(1),
                        style: TextStyle(
                            fontSize: 12,
                            color: _statusColor(status),
                            fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 20),
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                const SizedBox(width: 6),
                Text(_shortDate(booking['date'] as String? ?? ''),
                    style: theme.textTheme.bodySmall),
                const SizedBox(width: 16),
                const Icon(Icons.timelapse, size: 14, color: Colors.grey),
                const SizedBox(width: 6),
                Text('${booking['numberOfDays'] ?? '—'} day(s)',
                    style: theme.textTheme.bodySmall),
                const Spacer(),
                Text('₹${booking['totalPrice'] ?? '—'}',
                    style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: theme.colorScheme.primary)),
              ],
            ),
            if (status == 'completed') ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onFeedback,
                  icon: const Icon(Icons.star_outline, size: 18),
                  label: const Text('Rate this Worker'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _shortDate(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return iso;
    return '${d.day}/${d.month}/${d.year}';
  }
}
