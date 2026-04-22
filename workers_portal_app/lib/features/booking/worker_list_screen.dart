import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models/worker_model.dart';
import 'booking_provider.dart';
import 'date_picker_screen.dart';

const _jobTypeFilters = [
  'All',
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'AC Technician',
  'Mason',
];

class WorkerListScreen extends ConsumerStatefulWidget {
  const WorkerListScreen({super.key, required this.district, required this.town});

  final String district;
  final String town;

  @override
  ConsumerState<WorkerListScreen> createState() => _WorkerListScreenState();
}

class _WorkerListScreenState extends ConsumerState<WorkerListScreen> {
  String _jobFilter = 'All';

  @override
  Widget build(BuildContext context) {
    final params = (district: widget.district, town: widget.town);
    final workersAsync = ref.watch(workersProvider(params));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Available Workers'),
            Text('${widget.town}, ${widget.district}',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal)),
          ],
        ),
      ),
      body: Column(
        children: [
          // Job type filter chips
          SizedBox(
            height: 52,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _jobTypeFilters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final label = _jobTypeFilters[i];
                final selected = _jobFilter == label;
                return FilterChip(
                  label: Text(label),
                  selected: selected,
                  onSelected: (_) => setState(() => _jobFilter = label),
                  selectedColor: theme.colorScheme.primary,
                  labelStyle: TextStyle(color: selected ? Colors.white : null),
                  checkmarkColor: Colors.white,
                );
              },
            ),
          ),
          const Divider(height: 1),

          // Worker list
          Expanded(
            child: workersAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
                      const SizedBox(height: 12),
                      Text('Could not load workers', style: theme.textTheme.titleMedium),
                      const SizedBox(height: 4),
                      Text('Make sure the backend is running and the port is tunnelled.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodySmall),
                      const SizedBox(height: 16),
                      FilledButton.icon(
                        onPressed: () => ref.invalidate(workersProvider(params)),
                        icon: const Icon(Icons.refresh),
                        label: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (workers) {
                final filtered = _jobFilter == 'All'
                    ? workers
                    : workers.where((w) => w.jobType == _jobFilter).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.person_search, size: 56, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        Text('No workers found',
                            style: theme.textTheme.titleMedium
                                ?.copyWith(color: Colors.grey.shade600)),
                        const SizedBox(height: 4),
                        Text('Try a different job type or location.',
                            style: theme.textTheme.bodySmall),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _WorkerCard(
                    worker: filtered[i],
                    onSelect: () {
                      ref.read(bookingProvider.notifier).selectWorker(filtered[i]);
                      Navigator.push(context,
                          MaterialPageRoute(builder: (_) => const DatePickerScreen()));
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Worker Card ───────────────────────────────────────────────────────────────

class _WorkerCard extends StatelessWidget {
  const _WorkerCard({required this.worker, required this.onSelect});

  final WorkerModel worker;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onSelect,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 28,
                backgroundColor: theme.colorScheme.primary,
                child: Text(worker.initials,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
              ),
              const SizedBox(width: 16),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(worker.name,
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding:
                              const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.secondary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(worker.jobType,
                              style: TextStyle(
                                  fontSize: 12,
                                  color: theme.colorScheme.secondary,
                                  fontWeight: FontWeight.w600)),
                        ),
                        const SizedBox(width: 8),
                        Text('${worker.experienceYears} yr exp',
                            style: theme.textTheme.bodySmall),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        _StarRating(rating: worker.rating),
                        const SizedBox(width: 4),
                        Text('${worker.rating}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 13)),
                        Text(' (${worker.totalReviews} reviews)',
                            style: theme.textTheme.bodySmall),
                      ],
                    ),
                  ],
                ),
              ),

              // Daily rate + chevron
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('₹${worker.dailyRate.toInt()}',
                      style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: theme.colorScheme.primary)),
                  Text('/day', style: theme.textTheme.bodySmall),
                  const SizedBox(height: 4),
                  const Icon(Icons.chevron_right, color: Colors.grey),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StarRating extends StatelessWidget {
  const _StarRating({required this.rating});

  final double rating;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        if (i < rating.floor()) {
          return const Icon(Icons.star, size: 14, color: Colors.amber);
        } else if (i < rating) {
          return const Icon(Icons.star_half, size: 14, color: Colors.amber);
        }
        return const Icon(Icons.star_border, size: 14, color: Colors.amber);
      }),
    );
  }
}
