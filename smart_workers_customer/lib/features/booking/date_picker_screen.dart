import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../workers/worker_model.dart';
import 'booking_provider.dart';
import 'payment_screen.dart';

class DatePickerScreen extends ConsumerStatefulWidget {
  const DatePickerScreen({super.key});

  @override
  ConsumerState<DatePickerScreen> createState() => _DatePickerScreenState();
}

class _DatePickerScreenState extends ConsumerState<DatePickerScreen> {
  DateTime? _selectedDate;
  int _numberOfDays = 1;

  DateTime get _firstAllowedDate =>
      DateTime.now().add(const Duration(hours: 24));

  Future<void> _pickDate(WorkerModel worker) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _firstAllowedDate,
      firstDate: _firstAllowedDate,
      lastDate: DateTime.now().add(const Duration(days: 60)),
      helpText: 'Select service date',
      selectableDayPredicate: (day) => !worker.isDateBooked(day),
      builder: (context, child) => Theme(data: Theme.of(context), child: child!),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  bool _rangeConflicts(WorkerModel worker) {
    if (_selectedDate == null) return false;
    for (var d = 0; d < _numberOfDays; d++) {
      final day = _selectedDate!.add(Duration(days: d));
      if (worker.isDateBooked(day)) return true;
    }
    return false;
  }

  void _continue(WorkerModel worker) {
    if (_selectedDate == null) return;
    if (_rangeConflicts(worker)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('One or more selected days are already booked. Please choose different dates.'),
        backgroundColor: Colors.red,
      ));
      return;
    }
    ref.read(bookingProvider.notifier).setDate(_selectedDate!);
    ref.read(bookingProvider.notifier).setNumberOfDays(_numberOfDays);
    Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final worker = ref.watch(bookingProvider.select((s) => s.worker));
    final workerDetail = worker != null
        ? ref.watch(workerDetailProvider(worker.id))
        : null;
    final effectiveWorker =
        workerDetail?.valueOrNull ?? worker;
    final theme = Theme.of(context);

    final conflict = effectiveWorker != null && _rangeConflicts(effectiveWorker);

    return Scaffold(
      appBar: AppBar(title: const Text('Choose Date')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Worker summary strip
            if (effectiveWorker != null)
              Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: theme.colorScheme.primary,
                    child: Text(effectiveWorker.initials,
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                  title: Text(effectiveWorker.name,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(
                      '${effectiveWorker.jobType} · ₹${effectiveWorker.dailyRate.toInt()}/day'),
                ),
              ),
            const SizedBox(height: 12),

            // Booked dates info
            if (effectiveWorker != null &&
                effectiveWorker.bookedDates.isNotEmpty)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade100),
                ),
                child: Row(
                  children: [
                    Icon(Icons.event_busy, color: Colors.red.shade400, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${effectiveWorker.bookedDates.length} date(s) already booked — shown as unavailable in calendar.',
                        style:
                            TextStyle(color: Colors.red.shade700, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 12),

            // 24-hour notice info
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
                      'Earliest date: ${_fmt(_firstAllowedDate)}  (24-hour advance booking)',
                      style:
                          TextStyle(color: Colors.blue.shade700, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Date picker
            Text('Service Date', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            InkWell(
              onTap: effectiveWorker != null ? () => _pickDate(effectiveWorker) : null,
              borderRadius: BorderRadius.circular(8),
              child: InputDecorator(
                decoration: InputDecoration(
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.calendar_today),
                  errorText: conflict
                      ? 'This range overlaps with a booked date'
                      : null,
                ),
                child: Text(
                  _selectedDate == null
                      ? 'Tap to select date'
                      : _fmt(_selectedDate!),
                  style: TextStyle(
                      color: _selectedDate == null ? Colors.grey : null,
                      fontSize: 16),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Days slider
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Number of Days', style: theme.textTheme.labelLarge),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '$_numberOfDays ${_numberOfDays == 1 ? 'day' : 'days'}',
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold),
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
            if (effectiveWorker != null) ...[
              const SizedBox(height: 16),
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
                      '₹${(effectiveWorker.dailyRate * _numberOfDays).toInt()}',
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
              onPressed: (_selectedDate != null && effectiveWorker != null && !conflict)
                  ? () => _continue(effectiveWorker)
                  : null,
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Continue to Payment', style: TextStyle(fontSize: 16)),
              style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16)),
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(DateTime d) =>
      '${_dayName(d.weekday)}, ${d.day} ${_monthName(d.month)} ${d.year}';

  String _dayName(int w) =>
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][w - 1];

  String _monthName(int m) => [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ][m - 1];
}
