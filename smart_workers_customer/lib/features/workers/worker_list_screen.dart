import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'worker_model.dart';
import '../booking/booking_provider.dart';
import '../booking/date_picker_screen.dart';

class WorkerListScreen extends ConsumerWidget {
  const WorkerListScreen({
    super.key,
    required this.district,
    required this.town,
    this.jobType,
  });

  final String district;
  final String town;
  final String? jobType;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final params = (district: district, town: town, jobType: jobType);
    final workersAsync = ref.watch(workersProvider(params));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(jobType ?? 'All Workers'),
            Text('$town, $district',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal)),
          ],
        ),
      ),
      body: workersAsync.when(
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
                const Text(
                  'Make sure the backend is running\nand the port is tunnelled.',
                  textAlign: TextAlign.center,
                ),
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
          if (workers.isEmpty) {
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
                  const Text('Try a different location or job type.'),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: workers.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _WorkerCard(
              worker: workers[i],
              onBook: () {
                ref.read(bookingProvider.notifier).selectWorker(workers[i]);
                Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const DatePickerScreen()));
              },
            ),
          );
        },
      ),
    );
  }
}

// ── Worker card ───────────────────────────────────────────────────────────────

class _WorkerCard extends StatelessWidget {
  const _WorkerCard({required this.worker, required this.onBook});

  final WorkerModel worker;
  final VoidCallback onBook;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onBook,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: theme.colorScheme.primary,
                child: Text(worker.initials,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 18)),
              ),
              const SizedBox(width: 16),
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
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.secondary
                                .withValues(alpha: 0.15),
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
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('₹${worker.dailyRate.toInt()}',
                      style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: theme.colorScheme.primary)),
                  Text('/day', style: theme.textTheme.bodySmall),
                  const SizedBox(height: 4),
                  FilledButton(
                    onPressed: onBook,
                    style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                    child: const Text('Book', style: TextStyle(fontSize: 12)),
                  ),
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
