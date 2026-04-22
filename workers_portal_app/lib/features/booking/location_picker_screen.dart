import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/location_data.dart';
import 'booking_provider.dart';
import 'worker_list_screen.dart';

class LocationPickerScreen extends ConsumerStatefulWidget {
  const LocationPickerScreen({super.key});

  @override
  ConsumerState<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends ConsumerState<LocationPickerScreen> {
  String? _district;
  String? _town;

  List<String> get _towns => _district != null ? (locationData[_district] ?? []) : [];

  void _onDistrictChanged(String? value) {
    setState(() {
      _district = value;
      _town = null; // reset town when district changes
    });
  }

  void _findWorkers() {
    if (_district == null || _town == null) return;
    ref.read(bookingProvider.notifier).setLocation(_district!, _town!);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => WorkerListScreen(district: _district!, town: _town!),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Select Location')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            // Hero illustration
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Icon(Icons.location_on, size: 40, color: theme.colorScheme.primary),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Where do you need help?',
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text('We\'ll show workers available in your area.',
                            style: theme.textTheme.bodySmall),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // District picker
            Text('District', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            InputDecorator(
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              ),
              isEmpty: _district == null,
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _district,
                  isExpanded: true,
                  isDense: true,
                  hint: const Text('Select district'),
                  items: locationData.keys
                      .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                      .toList(),
                  onChanged: _onDistrictChanged,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Town picker
            Text('Town / Area', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            InputDecorator(
              decoration: InputDecoration(
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                filled: _district == null,
                fillColor: Colors.grey.shade100,
              ),
              isEmpty: _town == null,
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _town,
                  isExpanded: true,
                  isDense: true,
                  hint: Text(_district == null ? 'Select district first' : 'Select town'),
                  disabledHint: const Text('Select district first'),
                  items: _towns
                      .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                      .toList(),
                  onChanged: _district == null ? null : (v) => setState(() => _town = v),
                ),
              ),
            ),
            const Spacer(),

            // Find workers CTA
            FilledButton.icon(
              onPressed: (_district != null && _town != null) ? _findWorkers : null,
              icon: const Icon(Icons.search),
              label: const Text('Find Workers', style: TextStyle(fontSize: 16)),
              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
