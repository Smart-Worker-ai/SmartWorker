import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'booking_provider.dart';
import 'booking_summary_screen.dart';

class DatePickerScreen extends ConsumerStatefulWidget {
  const DatePickerScreen({super.key});

  @override
  ConsumerState<DatePickerScreen> createState() => _DatePickerScreenState();
}

class _DatePickerScreenState extends ConsumerState<DatePickerScreen> {
  DateTime? _selectedDate;
  int _numberOfDays = 1;

  // Bookings require 24-hour advance notice — earliest date is tomorrow.
  DateTime get _firstAllowedDate =>
      DateTime.now().add(const Duration(hours: 24));

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _firstAllowedDate,
      firstDate: _firstAllowedDate,
      lastDate: DateTime.now().add(const Duration(days: 60)),
      helpText: 'Select service date',
      builder: (context, child) => Theme(
        data: Theme.of(context),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  void _continue() {
    if (_selectedDate == null) return;
    ref.read(bookingProvider.notifier).setDate(_selectedDate!);
    ref.read(bookingProvider.notifier).setNumberOfDays(_numberOfDays);
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const BookingSummaryScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final worker = ref.watch(bookingProvider.select((s) => s.worker));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Choose Date')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Worker summary strip
            if (worker != null)
              Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: theme.colorScheme.primary,
                    child: Text(worker.initials,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                  title: Text(worker.name,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('${worker.jobType} · ₹${worker.dailyRate.toInt()}/day'),
                ),
              ),
            const SizedBox(height: 24),

            // 24-hour notice banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue.shade700, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Earliest available date: ${_formatDate(_firstAllowedDate)}  '
                      '(24-hour advance booking required)',
                      style: TextStyle(color: Colors.blue.shade700, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Date selector
            Text('Service Date', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(8),
              child: InputDecorator(
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.calendar_today),
                ),
                child: Text(
                  _selectedDate == null ? 'Tap to select date' : _formatDate(_selectedDate!),
                  style: TextStyle(
                    color: _selectedDate == null ? Colors.grey : null,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Number of days slider
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Number of Days', style: theme.textTheme.labelLarge),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '$_numberOfDays ${_numberOfDays == 1 ? 'day' : 'days'}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            Slider(
              value: _numberOfDays.toDouble(),
              min: 1,
              max: 7,
              divisions: 6,
              label: '$_numberOfDays',
              onChanged: (v) => setState(() => _numberOfDays = v.round()),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('1 day', style: theme.textTheme.bodySmall),
                Text('7 days', style: theme.textTheme.bodySmall),
              ],
            ),

            // Price preview
            if (worker != null) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Estimated total',
                        style: theme.textTheme.bodyMedium
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    Text(
                      '₹${(worker.dailyRate * _numberOfDays).toInt()}',
                      style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: theme.colorScheme.primary),
                    ),
                  ],
                ),
              ),
            ],

            const Spacer(),
            FilledButton.icon(
              onPressed: _selectedDate != null ? _continue : null,
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Continue to Summary', style: TextStyle(fontSize: 16)),
              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime d) =>
      '${_dayName(d.weekday)}, ${d.day} ${_monthName(d.month)} ${d.year}';

  String _dayName(int w) =>
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][w - 1];

  String _monthName(int m) => [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ][m - 1];
}
