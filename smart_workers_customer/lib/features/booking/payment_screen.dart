import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import 'booking_provider.dart';
import '../../../shared/app_shell.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  final _addressCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    if (!_formKey.currentState!.validate()) return;
    ref.read(bookingProvider.notifier).setAddress(_addressCtrl.text.trim());
    ref.read(bookingProvider.notifier).setNotes(_notesCtrl.text.trim());
    final error = await ref.read(bookingProvider.notifier).confirmBooking();
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error), backgroundColor: Colors.red));
      return;
    }
    ref.invalidate(myBookingsProvider);
    _showSuccess();
  }

  void _showSuccess() {
    final booking = ref.read(bookingProvider).confirmedBooking;
    if (booking == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        icon: const Icon(Icons.check_circle, color: Colors.green, size: 56),
        title: const Text('Booking Confirmed!'),
        content: Text(
          '${booking['jobType']} — ${booking['workerName']}\n\n'
          'Date: ${_shortDate(booking['date'] as String)}\n'
          'Duration: ${booking['numberOfDays']} day(s)\n'
          'Total Paid: ₹${booking['totalPrice']}\n\n'
          'Status: Pending confirmation from worker.',
        ),
        actions: [
          FilledButton(
            onPressed: () {
              ref.read(bookingProvider.notifier).reset();
              Navigator.of(context).popUntil((r) => r.isFirst);
              // Switch to Bookings tab so user sees it immediately
              ref.read(shellTabProvider.notifier).state = 2;
            },
            child: const Text('View Bookings'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _showFeedback(booking);
            },
            child: const Text('Rate Worker'),
          ),
        ],
      ),
    );
  }

  void _showFeedback(Map<String, dynamic> booking) {
    int stars = 0;
    final commentCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
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
              builder: (ctx, setSt) => Row(
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
                Navigator.pop(context);
                final err = await ref
                    .read(bookingProvider.notifier)
                    .submitFeedback(
                      booking['workerId'] as String,
                      booking['id'] as String,
                      stars,
                      commentCtrl.text.trim(),
                    );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content:
                        Text(err ?? 'Thank you for your feedback!'),
                    backgroundColor: err != null ? Colors.red : Colors.green,
                  ));
                }
                ref.read(bookingProvider.notifier).reset();
                if (mounted) {
                  Navigator.of(context).popUntil((r) => r.isFirst);
                }
              },
              child: const Text('Submit Rating'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final booking = ref.watch(bookingProvider);
    final worker = booking.worker;
    final theme = Theme.of(context);

    if (worker == null) {
      return const Scaffold(
          body: Center(child: Text('No worker selected.')));
    }

    final platformFee = (booking.totalPrice * 0.05).roundToDouble();
    final grandTotal = booking.totalPrice + platformFee;

    return Scaffold(
      appBar: AppBar(title: const Text('Payment Summary')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Worker
            _Section(
              title: 'Worker',
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: theme.colorScheme.primary,
                    child: Text(worker.initials,
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16)),
                  ),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(worker.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 16)),
                      Text(worker.jobType,
                          style: TextStyle(
                              color: theme.colorScheme.secondary,
                              fontWeight: FontWeight.w600)),
                      Row(
                        children: [
                          const Icon(Icons.star, size: 13, color: Colors.amber),
                          Text(' ${worker.rating}  ·  ${worker.totalReviews} reviews',
                              style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Schedule
            _Section(
              title: 'Schedule',
              child: Column(
                children: [
                  _InfoRow(
                    icon: Icons.calendar_today,
                    label: 'Date',
                    value: booking.date != null ? _longDate(booking.date!) : '—',
                  ),
                  const SizedBox(height: 8),
                  _InfoRow(
                    icon: Icons.timelapse,
                    label: 'Duration',
                    value: '${booking.numberOfDays} day(s)',
                  ),
                  const SizedBox(height: 8),
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: 'Location',
                    value: '${booking.town}, ${booking.district}',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Address
            _Section(
              title: 'Delivery Address',
              child: Column(
                children: [
                  TextFormField(
                    controller: _addressCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Full address',
                      border: OutlineInputBorder(),
                      hintText: 'e.g. 14, Anna Street, T. Nagar',
                      prefixIcon: Icon(Icons.home_outlined),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Address is required'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _notesCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Notes (optional)',
                      border: OutlineInputBorder(),
                      hintText: 'e.g. Call before arriving',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Price breakdown
            _Section(
              title: 'Payment Breakdown',
              child: Column(
                children: [
                  _PriceRow(
                    label:
                        '₹${worker.dailyRate.toInt()} × ${booking.numberOfDays} day(s)',
                    value: '₹${booking.totalPrice.toInt()}',
                  ),
                  const SizedBox(height: 6),
                  _PriceRow(
                    label: 'Platform fee (5%)',
                    value: '₹${platformFee.toInt()}',
                    valueColor: context.c.subtext,
                  ),
                  const Divider(height: 20),
                  _PriceRow(
                    label: 'Total Amount',
                    value: '₹${grandTotal.toInt()}',
                    bold: true,
                    valueColor: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 8),
                  // Payment method badge
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: context.c.tintBg(Colors.green),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: context.c.tintBorder(Colors.green)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.payments_outlined,
                            color: context.c.tintText(Colors.green), size: 18),
                        const SizedBox(width: 8),
                        Text('Pay on service completion',
                            style: TextStyle(
                                color: context.c.tintText(Colors.green),
                                fontWeight: FontWeight.w600,
                                fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            FilledButton.icon(
              onPressed: booking.isLoading ? null : _pay,
              icon: booking.isLoading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check_circle_outline),
              label: Text(
                booking.isLoading
                    ? 'Confirming…'
                    : 'Confirm Booking  ₹${grandTotal.toInt()}',
                style: const TextStyle(fontSize: 16),
              ),
              style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16)),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  String _longDate(DateTime d) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }

  String _shortDate(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return iso;
    return '${d.day}/${d.month}/${d.year}';
  }
}

// ── Shared widgets ────────────────────────────────────────────────────────────

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: context.c.subtext)),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(
      {required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: context.c.muted),
        const SizedBox(width: 10),
        Text('$label: ',
            style: TextStyle(color: context.c.subtext, fontSize: 13)),
        Expanded(
          child: Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, fontSize: 13)),
        ),
      ],
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.valueColor,
  });
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w800 : FontWeight.normal,
      fontSize: bold ? 17 : 14,
    );
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Text(value, style: style.copyWith(color: valueColor)),
      ],
    );
  }
}
