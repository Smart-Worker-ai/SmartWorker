import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'booking_provider.dart';
import 'location_picker_screen.dart';

class BookingScreen extends ConsumerWidget {
  const BookingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final myBookings = ref.watch(myBookingsProvider);

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
      body: myBookings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => _EmptyBookings(onBook: () => _startBooking(context)),
        data: (bookings) => bookings.isEmpty
            ? _EmptyBookings(onBook: () => _startBooking(context))
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: bookings.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _BookingCard(booking: bookings[i]),
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _startBooking(context),
        icon: const Icon(Icons.add),
        label: const Text('Book a Worker'),
      ),
    );
  }

  void _startBooking(BuildContext context) {
    Navigator.push(
        context, MaterialPageRoute(builder: (_) => const LocationPickerScreen()));
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyBookings extends StatelessWidget {
  const _EmptyBookings({required this.onBook});

  final VoidCallback onBook;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.handyman_outlined, size: 72, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No bookings yet',
                style: theme.textTheme.titleLarge
                    ?.copyWith(color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            Text(
              'Book a skilled worker for any home service — '
              'electrician, plumber, carpenter and more.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: onBook,
              icon: const Icon(Icons.search),
              label: const Text('Find a Worker'),
              style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Booking card ──────────────────────────────────────────────────────────────

class _BookingCard extends StatelessWidget {
  const _BookingCard({required this.booking});

  final Map<String, dynamic> booking;

  Color _statusColor(String status) {
    return switch (status) {
      'confirmed' => Colors.green,
      'cancelled' => Colors.red,
      'completed' => Colors.blue,
      _ => Colors.orange,
    };
  }

  IconData _statusIcon(String status) {
    return switch (status) {
      'confirmed' => Icons.check_circle,
      'cancelled' => Icons.cancel,
      'completed' => Icons.task_alt,
      _ => Icons.hourglass_top,
    };
  }

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
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
                Text('${booking['numberOfDays']} day(s)',
                    style: theme.textTheme.bodySmall),
                const Spacer(),
                Text('₹${booking['totalPrice']}',
                    style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: theme.colorScheme.primary)),
              ],
            ),
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
