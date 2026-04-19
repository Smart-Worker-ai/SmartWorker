class WorkerModel {
  const WorkerModel({
    required this.id,
    required this.name,
    required this.jobType,
    required this.dailyRate,
    required this.district,
    required this.town,
    required this.rating,
    required this.totalReviews,
    required this.experienceYears,
    this.bookedDates = const [],
  });

  final String id;
  final String name;
  final String jobType;
  final double dailyRate;
  final String district;
  final String town;
  final double rating;
  final int totalReviews;
  final int experienceYears;
  final List<String> bookedDates; // ISO date strings: '2026-04-25'

  String get initials => name
      .trim()
      .split(' ')
      .where((w) => w.isNotEmpty)
      .map((w) => w[0].toUpperCase())
      .take(2)
      .join();

  bool isDateBooked(DateTime date) {
    final key =
        '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    return bookedDates.contains(key);
  }

  factory WorkerModel.fromJson(Map<String, dynamic> json) {
    return WorkerModel(
      id: json['id'] as String,
      name: json['name'] as String,
      jobType: json['jobType'] as String,
      dailyRate: (json['dailyRate'] as num).toDouble(),
      district: json['district'] as String,
      town: json['town'] as String,
      rating: (json['rating'] as num).toDouble(),
      totalReviews: (json['totalReviews'] as num).toInt(),
      experienceYears: (json['experienceYears'] as num).toInt(),
      bookedDates: (json['bookedDates'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }
}
