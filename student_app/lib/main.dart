import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'core/network/api_client.dart';
import 'core/storage/storage_service.dart';
import 'data/repositories/auth_repository_impl.dart';
import 'data/repositories/courses_repository_impl.dart';
import 'data/repositories/quizzes_repository_impl.dart';
import 'data/repositories/kholasa_repository.dart';
import 'data/datasources/curriculum_bank_data.dart';
import 'core/services/mindmap_cache_service.dart';
import 'domain/repositories/i_auth_repository.dart';
import 'domain/repositories/i_courses_repository.dart';
import 'domain/repositories/i_quizzes_repository.dart';
import 'presentation/viewmodels/auth_viewmodel.dart';
import 'presentation/viewmodels/courses_viewmodel.dart';
import 'presentation/viewmodels/home_viewmodel.dart';
import 'presentation/viewmodels/homework_viewmodel.dart';
import 'presentation/viewmodels/theme_viewmodel.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await CurriculumBankData.load();
  await MindmapCacheService.init();

  // 1. Core Services (Singletons)
  final storageService = await StorageService.init();
  final apiClient = ApiClient(storage: storageService);

  // 2. Data Repositories (Inversion of Control - concrete bound to domain interface)
  final IAuthRepository authRepository = AuthRepositoryImpl(
    apiClient: apiClient,
    storage: storageService,
  );

  final ICoursesRepository coursesRepository = CoursesRepositoryImpl(
    apiClient: apiClient,
  );

  final IQuizzesRepository quizzesRepository = QuizzesRepositoryImpl(
    apiClient: apiClient,
  );

  final kholasaRepository = KholasaRepository(
    apiClient: apiClient,
  );

  runApp(
    MultiProvider(
      providers: [
        // Core Providers
        Provider<StorageService>.value(value: storageService),
        Provider<ApiClient>.value(value: apiClient),
        Provider<IAuthRepository>.value(value: authRepository),
        Provider<ICoursesRepository>.value(value: coursesRepository),
        Provider<IQuizzesRepository>.value(value: quizzesRepository),
        Provider<KholasaRepository>.value(value: kholasaRepository),

        // ViewModels (MVVM Presentation Layer)
        ChangeNotifierProvider(
          create: (_) => ThemeViewModel(storage: storageService),
        ),
        ChangeNotifierProvider(
          create: (_) => AuthViewModel(authRepository: authRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => HomeViewModel(
            coursesRepository: coursesRepository,
            quizzesRepository: quizzesRepository,
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => CoursesViewModel(coursesRepository: coursesRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => HomeworkViewModel(quizzesRepository: quizzesRepository),
        ),
      ],
      child: const StudentApp(),
    ),
  );
}
