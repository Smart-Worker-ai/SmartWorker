import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/location_data.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/searchable_picker.dart';
import '../booking/booking_provider.dart';
import '../workers/worker_list_screen.dart';

// ── Job type metadata ─────────────────────────────────────────────────────────

class _JobMeta {
  const _JobMeta(this.label, this.icon, this.color);
  final String label;
  final IconData icon;
  final Color color;
}

const _jobTypes = [
  _JobMeta('All',          Icons.apps,                  Color(0xFF546E7A)),
  _JobMeta('Electrician',  Icons.electric_bolt,         Color(0xFFF9A825)),
  _JobMeta('Plumber',      Icons.plumbing,              Color(0xFF1E88E5)),
  _JobMeta('Carpenter',    Icons.carpenter,             Color(0xFF6D4C41)),
  _JobMeta('Painter',      Icons.format_paint,          Color(0xFF8E24AA)),
  _JobMeta('AC Technician',Icons.ac_unit,               Color(0xFF00ACC1)),
  _JobMeta('Mason',        Icons.domain,                Color(0xFF546E7A)),
  _JobMeta('Welder',       Icons.engineering,           Color(0xFFE64A19)),
];

// ── SearchScreen ──────────────────────────────────────────────────────────────

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key, this.initialJobType});

  /// Pre-select a job type when navigating from the dashboard.
  final String? initialJobType;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  String? _district;
  String? _town;
  late String _jobType;

  @override
  void initState() {
    super.initState();
    _jobType = widget.initialJobType ?? 'All';
  }

  List<String> get _districts => locationData.keys.toList();
  List<String> get _towns =>
      _district != null ? (locationData[_district] ?? []) : [];

  Future<void> _pickDistrict() async {
    final pick = await showSearchablePicker(
      context,
      title: 'Select District',
      items: _districts,
      selected: _district,
      hint: 'Search district…',
    );
    if (pick != null && pick != _district) {
      setState(() {
        _district = pick;
        _town = null;
      });
    }
  }

  Future<void> _pickTown() async {
    if (_district == null) return;
    final pick = await showSearchablePicker(
      context,
      title: 'Select Town / Area',
      items: _towns,
      selected: _town,
      hint: 'Search town or area…',
    );
    if (pick != null) setState(() => _town = pick);
  }

  void _search() {
    if (_district == null || _town == null) return;
    ref.read(bookingProvider.notifier).setLocation(_district!, _town!);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => WorkerListScreen(
          district: _district!,
          town: _town!,
          jobType: _jobType == 'All' ? null : _jobType,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final canSearch = _district != null && _town != null;

    return Scaffold(
      backgroundColor: context.c.bgDeep,
      appBar: AppBar(
        backgroundColor: const Color(0xFF1565C0),
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Find a Worker',
            style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: CustomScrollView(
        slivers: [
          // ── Location section ──────────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              color: const Color(0xFF1565C0),
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.location_on, color: Colors.white70, size: 16),
                        SizedBox(width: 6),
                        Text('Select Location',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 13)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // District picker
                    _LocationTile(
                      icon: Icons.map_outlined,
                      label: _district ?? 'Select District',
                      placeholder: _district == null,
                      onTap: _pickDistrict,
                    ),
                    const SizedBox(height: 10),
                    // Town picker
                    _LocationTile(
                      icon: Icons.location_city_outlined,
                      label: _town ?? (_district == null
                          ? 'Select district first'
                          : 'Select Town / Area'),
                      placeholder: _town == null,
                      onTap: _district != null ? _pickTown : null,
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Job type section ──────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 10),
              child: Row(
                children: [
                  Icon(Icons.build_circle_outlined,
                      size: 18, color: context.c.text),
                  const SizedBox(width: 8),
                  Text('Type of Worker',
                      style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: context.c.text)),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverGrid(
              delegate: SliverChildBuilderDelegate(
                (_, i) {
                  final jt = _jobTypes[i];
                  final selected = _jobType == jt.label;
                  return GestureDetector(
                    onTap: () => setState(() => _jobType = jt.label),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: selected
                            ? jt.color.withValues(alpha: context.c.isDark ? 0.20 : 0.12)
                            : context.c.bgNavy,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: selected ? jt.color : context.c.border,
                          width: selected ? 2 : 1,
                        ),
                        boxShadow: selected
                            ? [
                                BoxShadow(
                                  color: jt.color.withValues(alpha: 0.15),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                )
                              ]
                            : [],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(jt.icon,
                              size: 24,
                              color: selected ? jt.color : context.c.muted),
                          const SizedBox(height: 6),
                          Text(
                            jt.label,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: selected
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                              color: selected ? jt.color : context.c.subtext,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
                childCount: _jobTypes.length,
              ),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 0.88,
              ),
            ),
          ),

          // ── Search button ─────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
              child: FilledButton.icon(
                onPressed: canSearch ? _search : null,
                icon: const Icon(Icons.search),
                label: Text(
                  canSearch
                      ? 'Search Workers in $_town'
                      : 'Select Location to Search',
                  style: const TextStyle(fontSize: 15),
                ),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFF1565C0),
                  disabledBackgroundColor: context.c.surface,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Location tile ─────────────────────────────────────────────────────────────

class _LocationTile extends StatelessWidget {
  const _LocationTile({
    required this.icon,
    required this.label,
    required this.placeholder,
    this.onTap,
  });
  final IconData icon;
  final String label;
  final bool placeholder;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: onTap == null
              ? Colors.white.withValues(alpha: 0.05)
              : Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: Colors.white.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white70, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: placeholder ? Colors.white54 : Colors.white,
                  fontWeight:
                      placeholder ? FontWeight.normal : FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
            Icon(
              placeholder ? Icons.keyboard_arrow_down : Icons.edit_outlined,
              color: Colors.white54,
              size: 18,
            ),
          ],
        ),
      ),
    );
  }
}
