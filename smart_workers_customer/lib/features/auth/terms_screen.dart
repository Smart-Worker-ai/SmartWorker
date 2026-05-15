import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class TermsScreen extends StatefulWidget {
  const TermsScreen({super.key, required this.onAccept});
  final VoidCallback onAccept;

  @override
  State<TermsScreen> createState() => _TermsScreenState();
}

class _TermsScreenState extends State<TermsScreen> {
  bool _scrolledToBottom = false;
  bool _agreed = false;
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  void _onScroll() {
    if (!_scrolledToBottom &&
        _scrollCtrl.offset >= _scrollCtrl.position.maxScrollExtent - 40) {
      setState(() => _scrolledToBottom = true);
    }
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = context.c;
    return Scaffold(
      appBar: AppBar(title: const Text('Terms & Conditions')),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              controller: _scrollCtrl,
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Smart Workers — Terms & Conditions',
                      style: theme.textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text('Last updated: April 2026',
                      style: TextStyle(color: c.subtext, fontSize: 12)),
                  const SizedBox(height: 20),
                  ..._sections.map((s) => _Section(title: s.$1, body: s.$2)),
                  const SizedBox(height: 20),
                  if (!_scrolledToBottom)
                    Center(
                      child: Column(
                        children: [
                          Icon(Icons.keyboard_arrow_down, color: c.muted),
                          Text('Scroll to read all',
                              style: TextStyle(color: c.muted, fontSize: 12)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: BoxDecoration(
              color: c.bgNavy,
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 8,
                    offset: const Offset(0, -2))
              ],
            ),
            child: Column(
              children: [
                CheckboxListTile(
                  value: _agreed,
                  onChanged: _scrolledToBottom
                      ? (v) => setState(() => _agreed = v ?? false)
                      : null,
                  title: const Text(
                      'I have read and agree to the Terms & Conditions',
                      style: TextStyle(fontSize: 13)),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _agreed ? widget.onAccept : null,
                    style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16)),
                    child: const Text('Accept & Continue',
                        style: TextStyle(fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.body});
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 6),
          Builder(builder: (context) => Text(body,
              style: TextStyle(
                  color: context.c.subtext,
                  fontSize: 13,
                  height: 1.55))),
        ],
      ),
    );
  }
}

const _sections = [
  ('1. Acceptance of Terms',
   'By registering or using the Smart Workers platform ("Service"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the Service.'),
  ('2. Description of Service',
   'Smart Workers connects customers with skilled tradespeople ("Workers") for home and commercial services in Kerala. We act as a platform intermediary and do not directly employ Workers.'),
  ('3. User Eligibility',
   'You must be at least 18 years of age to use this Service. By registering, you confirm that all information you provide is accurate and up-to-date.'),
  ('4. Bookings & Payments',
   'All bookings are subject to Worker availability. Prices are set by the platform based on service type and location. Cancellations made less than 24 hours before the scheduled service may be subject to a cancellation fee.'),
  ('5. User Conduct',
   'You agree not to: (a) harass or abuse Workers or other users; (b) provide false information; (c) use the platform for any unlawful purpose; (d) attempt to circumvent platform payments by contacting Workers directly outside the platform.'),
  ('6. Grievances',
   'If you have a complaint regarding a Worker or service, you may submit a grievance through the app. Our team will review it within 48 hours and take appropriate action.'),
  ('7. Limitation of Liability',
   'Smart Workers is a marketplace platform. We are not liable for the quality of services provided by Workers, property damage caused by Workers, or any indirect or consequential damages arising from use of the platform.'),
  ('8. Privacy',
   'Your personal data (name, phone number, email, booking history) is stored securely and used solely to facilitate the Service. We do not sell your data to third parties. Phone numbers are verified via Firebase Authentication.'),
  ('9. Modifications',
   'We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.'),
  ('10. Governing Law',
   'These Terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Kerala, India.'),
  ('11. Contact',
   'For questions or concerns, contact us at support@smartworkers.in.'),
];
