import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../auth/auth_provider.dart';
import '../booking/booking_provider.dart';
import '../search/search_screen.dart';

// ── Job category metadata ─────────────────────────────────────────────────────

class _Category {
  const _Category(this.label, this.icon, this.color);
  final String label;
  final IconData icon;
  final Color color;
}

const _categories = [
  _Category('Electrician',  Icons.electric_bolt,         Color(0xFFF9A825)),
  _Category('Plumber',      Icons.plumbing,              Color(0xFF1E88E5)),
  _Category('Carpenter',    Icons.carpenter,             Color(0xFF6D4C41)),
  _Category('Painter',      Icons.format_paint,          Color(0xFF8E24AA)),
  _Category('AC Technician',Icons.ac_unit,               Color(0xFF00ACC1)),
  _Category('Mason',        Icons.domain,                Color(0xFF546E7A)),
  _Category('Welder',       Icons.engineering,           Color(0xFFE64A19)),
  _Category('More',         Icons.build_circle_outlined, Color(0xFF43A047)),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

String _greeting() {
  final h = DateTime.now().hour;
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider.select((s) => s.user));
    final bookingsAsync = ref.watch(myBookingsProvider);
    final name = (user?['name'] as String? ?? 'there').split(' ').first;

    return Scaffold(
      backgroundColor: context.c.bgDeep,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myBookingsProvider),
        child: CustomScrollView(
          slivers: [
            // ── Combined header + stats (single block, no clipping) ───────
            SliverToBoxAdapter(
              child: bookingsAsync.when(
                loading: () => _HeroBlock(
                  greeting: _greeting(),
                  name: name,
                  stats: const (total: 0, active: 0, completed: 0, spent: 0),
                ),
                error: (_, __) => _HeroBlock(
                  greeting: _greeting(),
                  name: name,
                  stats: const (total: 0, active: 0, completed: 0, spent: 0),
                ),
                data: (bookings) {
                  final active = bookings.where((b) =>
                      b['status'] == 'pending' || b['status'] == 'confirmed').length;
                  final completed = bookings.where((b) => b['status'] == 'completed').length;
                  final spent = bookings
                      .where((b) => b['status'] == 'completed')
                      .fold<num>(0, (s, b) => s + ((b['totalPrice'] as num?) ?? 0))
                      .toInt();
                  return _HeroBlock(
                    greeting: _greeting(),
                    name: name,
                    stats: (
                      total: bookings.length,
                      active: active,
                      completed: completed,
                      spent: spent,
                    ),
                  );
                },
              ),
            ),

            // ── Quick search ──────────────────────────────────────────────
            const SliverToBoxAdapter(
              child: _QuickSearchCard(),
            ),

            // ── Browse by service ─────────────────────────────────────────
            const SliverToBoxAdapter(
              child: _SectionHeader(icon: Icons.grid_view_rounded, title: 'Browse by Service'),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
              sliver: SliverGrid(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) => _CategoryCard(
                    category: _categories[i],
                    onTap: () => Navigator.push(
                      ctx,
                      MaterialPageRoute(
                        builder: (_) => SearchScreen(
                          initialJobType: _categories[i].label == 'More'
                              ? null
                              : _categories[i].label,
                        ),
                      ),
                    ),
                  ),
                  childCount: _categories.length,
                ),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 4,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 0.88,
                ),
              ),
            ),

            // ── Recent activity ───────────────────────────────────────────
            const SliverToBoxAdapter(
              child: _SectionHeader(icon: Icons.history_rounded, title: 'Recent Activity'),
            ),
            bookingsAsync.when(
              loading: () => const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
              error: (_, __) => const SliverToBoxAdapter(child: SizedBox()),
              data: (bookings) {
                if (bookings.isEmpty) {
                  return const SliverToBoxAdapter(child: _EmptyActivity());
                }
                final recent = bookings.take(3).toList();
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (_, i) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _RecentBookingTile(booking: recent[i]),
                      ),
                      childCount: recent.length,
                    ),
                  ),
                );
              },
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }
}

// ── Notifications sheet ───────────────────────────────────────────────────────

void _showNotifications(BuildContext context) {
  showModalBottomSheet(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36, height: 4,
            decoration: BoxDecoration(
              color: context.c.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          const Row(
            children: [
              Icon(Icons.notifications_outlined, size: 20),
              SizedBox(width: 8),
              Text('Notifications',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 32),
          Icon(Icons.notifications_off_outlined, size: 48, color: context.c.muted),
          const SizedBox(height: 12),
          Text('No notifications yet',
              style: TextStyle(fontWeight: FontWeight.w600, color: context.c.text)),
          const SizedBox(height: 6),
          Text("You'll be notified about booking updates here",
              style: TextStyle(fontSize: 13, color: context.c.subtext)),
          const SizedBox(height: 24),
        ],
      ),
    ),
  );
}

// ── Hero block: gradient header + stats cards (unified, no clipping) ──────────

typedef _Stats = ({int total, int active, int completed, int spent});

class _HeroBlock extends StatelessWidget {
  const _HeroBlock({required this.greeting, required this.name, required this.stats});

  final String greeting;
  final String name;
  final _Stats stats;

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        // ── Gradient background ──────────────────────────────────────────
        Container(
          width: double.infinity,
          padding: EdgeInsets.fromLTRB(20, topPad + 16, 20, 64),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF0D2B6E), Color(0xFF1565C0), Color(0xFF1976D2)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row: location badge + bell
              Row(
                children: [
                  const _Chip(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.location_on, size: 13, color: Colors.white70),
                        SizedBox(width: 4),
                        Text('Kerala',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => _showNotifications(context),
                    icon: const _IconCircle(icon: Icons.notifications_outlined),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              // Greeting
              Text('$greeting,',
                  style: const TextStyle(color: Colors.white60, fontSize: 13)),
              const SizedBox(height: 3),
              Text(name,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5)),
              const SizedBox(height: 6),
              const Text('What service do you need today?',
                  style: TextStyle(color: Colors.white54, fontSize: 13)),
            ],
          ),
        ),

        // ── Stats cards — positioned to overlap bottom of gradient ───────
        Positioned(
          bottom: -48,
          left: 16,
          right: 16,
          child: _StatsRow(stats: stats),
        ),
      ],
    );
  }
}

// Stats card row

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.stats});
  final _Stats stats;

  @override
  Widget build(BuildContext context) {
    final spent = stats.spent;
    final spentStr = spent >= 1000
        ? '₹${(spent / 1000).toStringAsFixed(1)}k'
        : '₹$spent';

    return Row(
      children: [
        _StatCard(value: '${stats.total}', label: 'Total',
            icon: Icons.receipt_long_rounded, color: const Color(0xFF1565C0)),
        const SizedBox(width: 8),
        _StatCard(value: '${stats.active}', label: 'Active',
            icon: Icons.pending_actions_rounded, color: const Color(0xFFF57C00)),
        const SizedBox(width: 8),
        _StatCard(value: '${stats.completed}', label: 'Done',
            icon: Icons.task_alt_rounded, color: const Color(0xFF2E7D32)),
        const SizedBox(width: 8),
        _StatCard(value: spentStr, label: 'Spent',
            icon: Icons.currency_rupee_rounded, color: const Color(0xFF6A1B9A)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
  });
  final String value;
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
        decoration: BoxDecoration(
          color: context.c.bgNavy,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: context.c.isDark ? 0.30 : 0.18),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.10),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(height: 8),
            Text(value,
                style: TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 15, color: color)),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                    fontSize: 10,
                    color: context.c.subtext,
                    fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

// Shared small header widgets

class _Chip extends StatelessWidget {
  const _Chip({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: child,
    );
  }
}

class _IconCircle extends StatelessWidget {
  const _IconCircle({required this.icon});
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Icon(icon, color: Colors.white, size: 20),
    );
  }
}

// ── Quick search card ─────────────────────────────────────────────────────────

class _QuickSearchCard extends StatelessWidget {
  const _QuickSearchCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      // top: 60 to clear the stats cards that overlap by 48 + a bit of gap
      padding: const EdgeInsets.fromLTRB(16, 64, 16, 8),
      child: GestureDetector(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const SearchScreen()),
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: context.c.bgNavy,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
                color: theme.colorScheme.primary.withValues(alpha: 0.15)),
            boxShadow: [
              BoxShadow(
                color: theme.colorScheme.primary.withValues(alpha: 0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.search, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Find a Worker Near You',
                        style: theme.textTheme.bodyMedium
                            ?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text('District · Area · Service type',
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: context.c.subtext)),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios,
                  size: 13, color: theme.colorScheme.primary),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Section header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.icon, required this.title});
  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      child: Row(
        children: [
          Icon(icon, size: 17, color: const Color(0xFF1565C0)),
          const SizedBox(width: 8),
          Text(title,
              style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: context.c.text,
                  letterSpacing: 0.2)),
        ],
      ),
    );
  }
}

// ── Category card ─────────────────────────────────────────────────────────────

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({required this.category, required this.onTap});
  final _Category category;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: context.c.bgNavy,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: category.color.withValues(alpha: context.c.isDark ? 0.20 : 0.10),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(11),
              decoration: BoxDecoration(
                color: category.color.withValues(alpha: context.c.isDark ? 0.20 : 0.10),
                shape: BoxShape.circle,
              ),
              child: Icon(category.icon, color: category.color, size: 22),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                category.label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: context.c.text,
                    height: 1.3),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Recent booking tile ───────────────────────────────────────────────────────

class _RecentBookingTile extends StatelessWidget {
  const _RecentBookingTile({required this.booking});
  final Map<String, dynamic> booking;

  static const _meta = {
    'pending':   (color: Color(0xFFF57C00), icon: Icons.hourglass_top,  label: 'Pending'),
    'confirmed': (color: Color(0xFF2E7D32), icon: Icons.check_circle,   label: 'Confirmed'),
    'completed': (color: Color(0xFF1565C0), icon: Icons.task_alt,       label: 'Completed'),
    'cancelled': (color: Color(0xFFC62828), icon: Icons.cancel,         label: 'Cancelled'),
  };

  @override
  Widget build(BuildContext context) {
    final status = booking['status'] as String? ?? 'pending';
    final m = _meta[status] ??
        (color: const Color(0xFFF57C00), icon: Icons.hourglass_top, label: 'Pending');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.c.bgNavy,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: context.c.isDark ? 0.30 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: m.color.withValues(alpha: context.c.isDark ? 0.20 : 0.10),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_jobIcon(booking['jobType'] as String? ?? ''),
                color: m.color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(booking['workerName'] as String? ?? '',
                    style: TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 14,
                        color: context.c.text)),
                const SizedBox(height: 3),
                Text(
                  '${booking['jobType']}  ·  ${_shortDate(booking['date'] as String? ?? '')}',
                  style: TextStyle(color: context.c.subtext, fontSize: 12),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('₹${booking['totalPrice'] ?? '—'}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: Color(0xFF1565C0))),
              const SizedBox(height: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: m.color.withValues(alpha: context.c.isDark ? 0.20 : 0.10),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(m.icon, size: 10, color: m.color),
                    const SizedBox(width: 3),
                    Text(m.label,
                        style: TextStyle(
                            fontSize: 10,
                            color: m.color,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _jobIcon(String jt) => switch (jt) {
        'Electrician'  => Icons.electric_bolt,
        'Plumber'      => Icons.plumbing,
        'Carpenter'    => Icons.carpenter,
        'Painter'      => Icons.format_paint,
        'AC Technician'=> Icons.ac_unit,
        'Mason'        => Icons.domain,
        'Welder'       => Icons.engineering,
        _              => Icons.build,
      };

  String _shortDate(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '';
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${d.day} ${m[d.month - 1]}';
  }
}

// ── Empty activity ────────────────────────────────────────────────────────────

class _EmptyActivity extends StatelessWidget {
  const _EmptyActivity();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
        decoration: BoxDecoration(
          color: context.c.bgNavy,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.c.border),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1565C0).withValues(alpha: context.c.isDark ? 0.15 : 0.06),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.inbox_outlined,
                  size: 32, color: Color(0xFF1565C0)),
            ),
            const SizedBox(height: 14),
            Text('No bookings yet',
                style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    color: context.c.text)),
            const SizedBox(height: 5),
            Text('Tap Search to book your first worker',
                style: TextStyle(fontSize: 12, color: context.c.subtext)),
          ],
        ),
      ),
    );
  }
}
