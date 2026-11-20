import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../services/active_video_service.dart';
import '../widgets/draggable_mistakes_button.dart';
import '../widgets/mini_video_player_bar.dart';
import 'home/home_view.dart';
import 'courses/courses_view.dart';
import 'kholasa/kholasa_view.dart';
import 'quizzes/quizzes_view.dart';
import 'profile/profile_view.dart';

class MainNavigationView extends StatefulWidget {
  const MainNavigationView({super.key});

  @override
  State<MainNavigationView> createState() => _MainNavigationViewState();
}

class _MainNavigationViewState extends State<MainNavigationView> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    HomeView(),
    CoursesView(),
    KholasaView(), // Exact center!
    QuizzesView(),
    ProfileView(),
  ];

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ActiveVideoService(),
      builder: (context, _) {
        final hasFloatingVideo = ActiveVideoService().hasActiveVideo && ActiveVideoService().isMinimized;

        return Scaffold(
          backgroundColor: AppColors.bgLight,
          extendBody: false,
          body: Stack(
            children: [
              IndexedStack(
                index: _currentIndex,
                children: _pages,
              ),
              const DraggableMistakesButton(),
            ],
          ),
          bottomNavigationBar: SafeArea(
            top: false,
            left: false,
            right: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // ── Floating Picture-in-Picture Mini Video Player ──
                if (hasFloatingVideo) const MiniVideoPlayerBar(),

                // ── High-End Modern Docked Navigation Bar ──
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: const Border(
                      top: BorderSide(color: Color(0xFFE2E8F0), width: 1.0),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 14,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.only(top: 6, bottom: 8),
                  child: SizedBox(
                    height: 52,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        _buildNavItem(
                          index: 0,
                          icon: Icons.home_outlined,
                          activeIcon: Icons.home_rounded,
                          label: 'الرئيسية',
                        ),
                        _buildNavItem(
                          index: 1,
                          icon: Icons.play_lesson_outlined,
                          activeIcon: Icons.play_lesson_rounded,
                          label: 'الدروس',
                        ),
                        _buildCenterKholasaItem(index: 2),
                        _buildNavItem(
                          index: 3,
                          icon: Icons.assignment_outlined,
                          activeIcon: Icons.assignment_rounded,
                          label: 'الاختبارات',
                        ),
                        _buildNavItem(
                          index: 4,
                          icon: Icons.person_outline_rounded,
                          activeIcon: Icons.person_rounded,
                          label: 'حسابي',
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCenterKholasaItem({required int index}) {
    final isSelected = _currentIndex == index;

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(
                gradient: isSelected
                    ? const LinearGradient(
                        colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : const LinearGradient(
                        colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.35),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ]
                    : [],
                border: Border.all(
                  color: isSelected ? Colors.transparent : const Color(0xFFBFDBFE),
                  width: 1.2,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isSelected ? Icons.auto_awesome_rounded : Icons.auto_awesome_outlined,
                    color: isSelected ? const Color(0xFFFBBF24) : AppColors.blue,
                    size: 18,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 3),
            Text(
              'الخلاصة',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                color: isSelected ? AppColors.blue : const Color(0xFF475569),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
  }) {
    final isSelected = _currentIndex == index;

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFEBF5FF) : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                isSelected ? activeIcon : icon,
                color: isSelected ? AppColors.blue : const Color(0xFF94A3B8),
                size: 22,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                color: isSelected ? AppColors.blue : const Color(0xFF64748B),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
