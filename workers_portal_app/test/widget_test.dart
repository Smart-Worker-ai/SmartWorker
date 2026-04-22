import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workers_portal_app/main.dart';

void main() {
  testWidgets('app boots', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: WorkersPortalApp()));
    expect(find.text('Smart Workers'), findsOneWidget);
  });
}
