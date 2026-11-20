class ApiEndpoints {
  ApiEndpoints._();

  // Production Server Base URL
  static const String baseUrl = 'https://drelmahdy.com';

  // Auth & Student Profile
  static const String studentLogin = '$baseUrl/api/student/login';
  static const String studentMe = '$baseUrl/api/student/me';
  static const String studentLogout = '$baseUrl/api/student/logout';

  // Learning, Curriculums & Videos
  static const String courses = '$baseUrl/api/courses';
  static const String videos = '$baseUrl/api/videos';
  static String videoStreamUrl(int videoId) => '$baseUrl/api/videos/$videoId/stream-url';

  // Quizzes & Electronic Exams
  static const String quizzes = '$baseUrl/api/learning/quizzes';
  static String quizDetails(int id) => '$baseUrl/api/learning/quizzes/$id';
  static String submitQuiz(int id) => '$baseUrl/api/learning/quizzes/$id/submit';
  static String reviewQuiz(int id) => '$baseUrl/api/learning/quizzes/$id/review';
  static String markQuizViewed(int id) => '$baseUrl/api/learning/quizzes/$id/view';

  // Student Notes
  static String lessonNotes(int videoId) => '$baseUrl/api/learning/notes/$videoId';

  // Notifications
  static const String notifications = '$baseUrl/api/learning/notifications';
  static String markNotificationRead(dynamic id) => '$baseUrl/api/learning/notifications/$id/read';
  static const String markAllNotificationsRead = '$baseUrl/api/learning/notifications/read-all';

  // Mistakes
  static const String mistakes = '$baseUrl/api/learning/mistakes';
  static const String recordMistake = '$baseUrl/api/learning/mistakes/record';
  static String resolveMistake(dynamic id) => '$baseUrl/api/learning/mistakes/$id/resolve';

  // Kholasa, Definitions, Flashcards & Questions
  static String kholasaVideo(int videoId) => '$baseUrl/api/learning/kholasa/video/$videoId';
  static String kholasaQuestions(
    int materialId,
    String type, {
    String difficulty = 'all',
    int page = 1,
    int limit = 15,
  }) =>
      '$baseUrl/api/learning/kholasa/materials/$materialId/questions?type=$type&difficulty=$difficulty&page=$page&limit=$limit';
  static String kholasaCheckAnswer(int materialId) =>
      '$baseUrl/api/learning/kholasa/materials/$materialId/check-answer';
}
