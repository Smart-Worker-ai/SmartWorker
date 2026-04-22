import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models/worker_model.dart';
import '../auth/auth_provider.dart';

// ── Booking flow state ────────────────────────────────────────────────────────

class BookingFlowState {
  const BookingFlowState({
    this.district,
    this.town,
    this.worker,
    this.date,
    this.numberOfDays = 1,
    this.address = '',
    this.notes = '',
    this.isLoading = false,
    this.error,
    this.confirmedBooking,
  });

  final String? district;
  final String? town;
  final WorkerModel? worker;
  final DateTime? date;
  final int numberOfDays;
  final String address;
  final String notes;
  final bool isLoading;
  final String? error;
  final Map<String, dynamic>? confirmedBooking;

  double get totalPrice => (worker?.dailyRate ?? 0) * numberOfDays;

  BookingFlowState copyWith({
    String? district,
    String? town,
    WorkerModel? worker,
    DateTime? date,
    int? numberOfDays,
    String? address,
    String? notes,
    bool? isLoading,
    String? error,
    Map<String, dynamic>? confirmedBooking,
    bool clearError = false,
    bool clearWorker = false,
    bool clearConfirmed = false,
  }) {
    return BookingFlowState(
      district: district ?? this.district,
      town: town ?? this.town,
      worker: clearWorker ? null : (worker ?? this.worker),
      date: date ?? this.date,
      numberOfDays: numberOfDays ?? this.numberOfDays,
      address: address ?? this.address,
      notes: notes ?? this.notes,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      confirmedBooking: clearConfirmed ? null : (confirmedBooking ?? this.confirmedBooking),
    );
  }
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class BookingNotifier extends StateNotifier<BookingFlowState> {
  BookingNotifier(this._ref) : super(const BookingFlowState());

  final Ref _ref;

  Dio get _dio => _ref.read(dioProvider);

  void setLocation(String district, String town) {
    state = state.copyWith(
      district: district,
      town: town,
      clearWorker: true, // reset worker if location changes
    );
  }

  void selectWorker(WorkerModel worker) {
    state = state.copyWith(worker: worker);
  }

  void setDate(DateTime date) {
    state = state.copyWith(date: date);
  }

  void setNumberOfDays(int days) {
    state = state.copyWith(numberOfDays: days);
  }

  void setAddress(String address) {
    state = state.copyWith(address: address);
  }

  void setNotes(String notes) {
    state = state.copyWith(notes: notes);
  }

  void reset() {
    state = const BookingFlowState();
  }

  Future<String?> confirmBooking() async {
    final s = state;
    if (s.worker == null || s.date == null || s.address.isEmpty) {
      return 'Missing required booking details.';
    }

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res = await _dio.post('/bookings', data: {
        'workerId': s.worker!.id,
        'date': s.date!.toIso8601String(),
        'numberOfDays': s.numberOfDays,
        'address': s.address,
        'notes': s.notes,
      });
      state = state.copyWith(
        isLoading: false,
        confirmedBooking: Map<String, dynamic>.from(res.data['booking'] as Map),
      );
      return null;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] as String? ?? 'Booking failed. Please try again.';
      state = state.copyWith(isLoading: false, error: msg);
      return msg;
    }
  }

  Future<String?> submitFeedback(String workerId, String? bookingId, int rating, String comment) async {
    try {
      await _dio.post('/feedback', data: {
        'workerId': workerId,
        if (bookingId != null) 'bookingId': bookingId,
        'rating': rating,
        'comment': comment,
      });
      return null;
    } on DioException catch (e) {
      return e.response?.data?['message'] as String? ?? 'Failed to submit feedback.';
    }
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final bookingProvider = StateNotifierProvider<BookingNotifier, BookingFlowState>((ref) {
  return BookingNotifier(ref);
});

/// Fetches workers filtered by district + town. Re-fetches when location changes.
final workersProvider = FutureProvider.autoDispose
    .family<List<WorkerModel>, ({String district, String town})>((ref, params) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get('/bookings/workers', queryParameters: {
    'district': params.district,
    'town': params.town,
  });
  final list = (res.data['workers'] as List)
      .map((w) => WorkerModel.fromJson(Map<String, dynamic>.from(w as Map)))
      .toList();
  return list;
});

/// All bookings for the logged-in customer.
final myBookingsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get('/bookings/my');
  return (res.data['bookings'] as List)
      .map((b) => Map<String, dynamic>.from(b as Map))
      .toList();
});
