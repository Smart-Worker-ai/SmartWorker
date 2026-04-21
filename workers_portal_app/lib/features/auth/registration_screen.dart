import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import '../../shared/app_shell.dart';

const _jobTypes = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'AC Technician',
  'Mason',
  'Welder',
  'Other',
];

class RegistrationScreen extends ConsumerStatefulWidget {
  const RegistrationScreen({super.key});

  @override
  ConsumerState<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends ConsumerState<RegistrationScreen> {
  int _step = 0;

  // Step 1
  final _nameController = TextEditingController();
  final _ageController = TextEditingController();
  final _step1Key = GlobalKey<FormState>();

  // Step 2
  String? _selectedJobType;
  final _expController = TextEditingController();
  final _step2Key = GlobalKey<FormState>();

  // Step 3
  final _cityController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _expController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  void _next() {
    if (_step == 0 && !_step1Key.currentState!.validate()) return;
    if (_step == 1) {
      if (!_step2Key.currentState!.validate()) return;
      if (_selectedJobType == null) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Please select a job type')));
        return;
      }
    }
    if (_step < 2) {
      setState(() => _step++);
    } else {
      _submit();
    }
  }

  Future<void> _submit() async {
    final data = {
      'name': _nameController.text.trim(),
      'age': int.tryParse(_ageController.text.trim()) ?? 0,
      'jobType': _selectedJobType,
      'experienceYears': int.tryParse(_expController.text.trim()) ?? 0,
      'city': _cityController.text.trim(),
    };
    final error = await ref.read(authProvider.notifier).completeProfile(data);
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.red));
      return;
    }
    Navigator.pushAndRemoveUntil(
        context, MaterialPageRoute(builder: (_) => const AppShell()), (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider.select((s) => s.isLoading));

    return Scaffold(
      appBar: AppBar(title: const Text('Create your profile')),
      body: Stepper(
        currentStep: _step,
        onStepTapped: (i) {
          if (i < _step) setState(() => _step = i);
        },
        controlsBuilder: (context, details) {
          return Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Row(
              children: [
                FilledButton(
                  onPressed: isLoading ? null : _next,
                  child: isLoading && _step == 2
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_step == 2 ? 'Finish' : 'Continue'),
                ),
                if (_step > 0) ...[
                  const SizedBox(width: 12),
                  TextButton(
                    onPressed: () => setState(() => _step--),
                    child: const Text('Back'),
                  ),
                ],
              ],
            ),
          );
        },
        steps: [
          Step(
            title: const Text('Personal Details'),
            isActive: _step >= 0,
            state: _step > 0 ? StepState.complete : StepState.indexed,
            content: Form(
              key: _step1Key,
              child: Column(
                children: [
                  TextFormField(
                    controller: _nameController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Full name', border: OutlineInputBorder()),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _ageController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Age', border: OutlineInputBorder()),
                    validator: (v) {
                      final age = int.tryParse(v ?? '');
                      if (age == null || age < 18 || age > 65) return 'Enter a valid age (18–65)';
                      return null;
                    },
                  ),
                ],
              ),
            ),
          ),
          Step(
            title: const Text('Professional Info'),
            isActive: _step >= 1,
            state: _step > 1 ? StepState.complete : StepState.indexed,
            content: Form(
              key: _step2Key,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Job type',
                      border: OutlineInputBorder(),
                    ),
                    isEmpty: _selectedJobType == null,
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedJobType,
                        isDense: true,
                        hint: const Text('Select job type'),
                        isExpanded: true,
                        onChanged: (v) => setState(() => _selectedJobType = v),
                        items: _jobTypes
                            .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                            .toList(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _expController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                        labelText: 'Years of experience', border: OutlineInputBorder()),
                    validator: (v) {
                      final y = int.tryParse(v ?? '');
                      if (y == null || y < 0) return 'Enter valid years';
                      return null;
                    },
                  ),
                ],
              ),
            ),
          ),
          Step(
            title: const Text('Location'),
            isActive: _step >= 2,
            content: Column(
              children: [
                TextFormField(
                  controller: _cityController,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'City / District',
                    border: OutlineInputBorder(),
                    hintText: 'e.g. Chennai, Coimbatore',
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'You can skip this and update it later from your profile.',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
