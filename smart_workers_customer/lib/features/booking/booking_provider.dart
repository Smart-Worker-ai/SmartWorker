import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../workers/worker_model.dart';
import '../auth/auth_provider.dart';

// ── State ─────────────────────────────────────────────────────────────────────

class BookingFlowState {
  const BookingFlowState({
    this.district,
    this.town,
    this.worker,
    this.date,
    this.numberOfDays = 1,
    this.address,
    this.notes,
    this.isLoading = false,
    this.error,
    this.confirmedBooking,
  });

  final String? district;
  final String? town;
  final WorkerModel? worker;
  final DateTime? date;
  final int numberOfDays;
  final String? address;
  final String? notes;
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
    bool clearConfirmed = false,
  }) {
    return BookingFlowState(
      district: district ?? this.district,
      town: town ?? this.town,
      worker: worker ?? this.worker,
      date: date ?? this.date,
      numberOfDays: numberOfDays ?? this.numberOfDays,
      address: address ?? this.address,
      notes: notes ?? this.notes,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      confirmedBooking:
          clearConfirmed ? null : (confirmedBooking ?? this.confirmedBooking),
    );
  }
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class BookingNotifier extends StateNotifier<BookingFlowState> {
  BookingNotifier(this._ref) : super(const BookingFlowState());

  final Ref _ref;

  Dio get _dio => _ref.read(dioProvider);

  void setLocation(String district, String town) =>
      state = state.copyWith(district: district, town: town);

  void selectWorker(WorkerModel worker) =>
      state = state.copyWith(worker: worker);

  void setDate(DateTime date) => state = state.copyWith(date: date);

  void setNumberOfDays(int days) => state = state.copyWith(numberOfDays: days);

  void setAddress(String address) => state = state.copyWith(address: address);

  void setNotes(String notes) => state = state.copyWith(notes: notes);

  void reset() => state = const BookingFlowState();

  Future<String?> confirmBooking() async {
    final w = state.worker;
    final d = state.date;
    if (w == null || d == null) return 'Missing booking details.';

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final resp = await _dio.post('/bookings', data: {
        'workerId': w.id,
        'date': d.toIso8601String(),
        'numberOfDays': state.numberOfDays,
        'address': state.address ?? '',
        'notes': state.notes ?? '',
      });
      final booking = Map<String, dynamic>.from(resp.data['booking'] as Map);
      state = state.copyWith(isLoading: false, confirmedBooking: booking);
      return null;
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ?? 'Booking failed.';
      state = state.copyWith(isLoading: false, error: msg);
      return msg;
    }
  }

  Future<String?> submitFeedback(
      String workerId, String bookingId, int rating, String comment) async {
    try {
      await _dio.post('/feedback', data: {
        'workerId': workerId,
        'bookingId': bookingId,
        'rating': rating,
        'comment': comment,
      });
      return null;
    } on DioException catch (e) {
      return e.response?.data?['error'] as String? ?? 'Could not submit feedback.';
    }
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final bookingProvider =
    StateNotifierProvider<BookingNotifier, BookingFlowState>(
  (ref) => BookingNotifier(ref),
);

// Workers list — parameterised by (district, town, jobType?)
typedef WorkerParams = ({String district, String town, String? jobType});

final workersProvider = FutureProvider.autoDispose
    .family<List<WorkerModel>, WorkerParams>((ref, params) async {
  final dio = ref.watch(dioProvider);
  final query = <String, dynamic>{
    'district': params.district,
    'town': params.town,
  };
  if (params.jobType != null) query['jobType'] = params.jobType;

  final resp = await dio.get('/bookings/workers', queryParameters: query);
  final list = resp.data['workers'] as List<dynamic>;
  return list
      .map((e) => WorkerModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

// Customer's own bookings
final myBookingsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final resp = await dio.get('/bookings/my');
  final list = resp.data['bookings'] as List<dynamic>;
  return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
});

// Single worker detail (includes bookedDates)
final workerDetailProvider =
    FutureProvider.autoDispose.family<WorkerModel, String>((ref, workerId) async {
  final dio = ref.watch(dioProvider);
  final resp = await dio.get('/bookings/workers/$workerId');
  return WorkerModel.fromJson(resp.data['worker'] as Map<String, dynamic>);
});
