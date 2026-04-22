class WorkerModel {
  const WorkerModel({
    required this.id,
    required this.name,
    required this.jobType,
    required this.dailyRate,
    required this.rating,
    required this.totalReviews,
    required this.district,
    required this.town,
    required this.experienceYears,
  });

  final String id;
  final String name;
  final String jobType;
  final double dailyRate;
  final double rating;
  final int totalReviews;
  final String district;
  final String town;
  final int experienceYears;

  String get initials => name
      .trim()
      .split(' ')
      .where((w) => w.isNotEmpty)
      .map((w) => w[0].toUpperCase())
      .take(2)
      .join();

  factory WorkerModel.fromJson(Map<String, dynamic> json) {
    return WorkerModel(
      id: json['id'] as String,
      name: json['name'] as String,
      jobType: json['jobType'] as String,
      dailyRate: (json['dailyRate'] as num).toDouble(),
      rating: (json['rating'] as num).toDouble(),
      totalReviews: (json['totalReviews'] as num).toInt(),
      district: json['district'] as String,
      town: json['town'] as String,
      experienceYears: (json['experienceYears'] as num).toInt(),
    );
  }
}
