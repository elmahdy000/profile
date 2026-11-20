import 'package:flutter/material.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/core/services/sound_service.dart';
import 'package:student_app/presentation/views/courses/courses_view.dart';
import 'package:student_app/presentation/views/files/files_view.dart';
import 'package:student_app/presentation/views/homework/homework_view.dart';
import 'package:student_app/presentation/views/quizzes/quizzes_view.dart';
import 'package:student_app/services/notifications_service.dart';

class NotificationsSheet extends StatelessWidget {
  const NotificationsSheet({super.key});

  static Future<void> show(BuildContext context) {
    SoundService().playPing();
    NotificationsService().fetchNotifications();
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const NotificationsSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final service = NotificationsService();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: ListenableBuilder(
        listenable: service,
        builder: (context, _) {
          final notifications = service.notifications;
          final unreadCount = service.unreadCount;

          return Container(
            height: MediaQuery.of(context).size.height * 0.72,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Drag Handle
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(top: 10, bottom: 6),
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),

                // Header Row
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'الإشعارات الأكاديمية',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: AppColors.ink,
                            ),
                          ),
                          if (unreadCount > 0) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.blue,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '$unreadCount جديدة',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      TextButton(
                        onPressed: unreadCount > 0 ? () => service.markAllAsRead() : null,
                        child: Text(
                          'تحديد الكل كمقروء',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                            color: unreadCount > 0 ? AppColors.blue : AppColors.muted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const Divider(height: 1, color: AppColors.line),

                // Notifications List
                Expanded(
                  child: notifications.isEmpty
                      ? const Center(
                          child: Text(
                            'لا توجد إشعارات حالياً',
                            style: TextStyle(color: AppColors.muted, fontSize: 13),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: notifications.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final notif = notifications[index];
                            return InkWell(
                              onTap: () {
                                service.markAsRead(notif.id);
                                Navigator.of(context).pop();
                                if (notif.targetRoute == 'courses') {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const CoursesView()),
                                  );
                                } else if (notif.targetRoute == 'homework') {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const HomeworkView()),
                                  );
                                } else if (notif.targetRoute == 'quizzes') {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const QuizzesView()),
                                  );
                                } else if (notif.targetRoute == 'files') {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const FilesView()),
                                  );
                                }
                              },
                              borderRadius: BorderRadius.circular(14),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: notif.isUnread ? AppColors.soft2 : Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: notif.isUnread
                                        ? AppColors.blue.withValues(alpha: 0.35)
                                        : AppColors.line,
                                    width: notif.isUnread ? 1.2 : 1.0,
                                  ),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Icon
                                    Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        color: notif.iconBg,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(notif.icon, color: notif.iconColor, size: 20),
                                    ),
                                    const SizedBox(width: 12),

                                    // Text Content
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  notif.title,
                                                  style: TextStyle(
                                                    fontSize: 12.5,
                                                    fontWeight:
                                                        notif.isUnread ? FontWeight.w900 : FontWeight.w700,
                                                    color: AppColors.ink,
                                                  ),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Text(
                                                notif.timeAgo,
                                                style: const TextStyle(
                                                  fontSize: 9.5,
                                                  color: AppColors.muted,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            notif.body,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: AppColors.textLightSecondary,
                                              height: 1.4,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                    if (notif.isUnread) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: const BoxDecoration(
                                          color: AppColors.blue,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
