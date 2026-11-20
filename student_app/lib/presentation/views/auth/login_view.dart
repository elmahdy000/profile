import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/presentation/viewmodels/auth_viewmodel.dart';
import 'package:student_app/presentation/widgets/animated_entrance.dart';
import 'package:student_app/presentation/widgets/primary_button.dart';
import 'package:student_app/presentation/views/main_navigation_view.dart';

class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  int _loginMode = 0; // 0 = Access Code, 1 = Phone

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin({String? overrideCode}) async {
    final code = overrideCode ?? _codeController.text.trim().toUpperCase();
    final phone = _phoneController.text.trim();

    if (overrideCode == null && !_formKey.currentState!.validate()) return;

    final authVm = context.read<AuthViewModel>();
    final success = await authVm.login(
      phone: phone.isNotEmpty ? phone : code,
      studentCode: code,
    );

    if (success && mounted) {
      _navigateToMain();
    }
  }

  Future<void> _enterAsGuestDemo() async {
    await context.read<AuthViewModel>().loginAsGuest();
    if (mounted) {
      _navigateToMain();
    }
  }

  void _navigateToMain() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 350),
        pageBuilder: (context, animation, secondaryAnimation) => FadeTransition(
          opacity: animation,
          child: const MainNavigationView(),
        ),
      ),
    );
  }

  Future<void> _contactSupport() async {
    final url = Uri.parse(
      'https://wa.me/201018882889?text=${Uri.encodeComponent("مرحباً د. محمود، أحتاج مساعدة في تسجيل الدخول لتطبيق الطلاب")}',
    );
    try {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: Container(
        decoration: BoxDecoration(
          gradient: isDark ? AppColors.obsidianGradient : null,
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 1. Minimalist Academic Brand Emblem (Clean, Non-Cartoon)
                      FadeSlideTransition(
                        offset: const Offset(0, -0.2),
                        child: Center(
                          child: Container(
                            width: 76,
                            height: 76,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isDark ? AppColors.cardDark : Colors.white,
                              border: Border.all(
                                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                width: 1.5,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: isDark
                                      ? Colors.black.withValues(alpha: 0.4)
                                      : Colors.black.withValues(alpha: 0.04),
                                  blurRadius: 16,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Icon(
                                Icons.school_outlined,
                                size: 36,
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                              ),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // 2. Typography & Platform Identity
                      FadeSlideTransition(
                        delay: const Duration(milliseconds: 60),
                        child: Column(
                          children: [
                            Text(
                              'د. محمود المهدي',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: isDark ? AppColors.textDark : AppColors.textLight,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? AppColors.cardDark
                                    : AppColors.bgLightSecondary,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                'الحاسب الآلي والذكاء الاصطناعي • منصة الطلاب',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.textDarkSecondary : AppColors.textLightSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // 3. Segmented Tab Switcher (Vector Icons, No Emojis)
                      FadeSlideTransition(
                        delay: const Duration(milliseconds: 100),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.cardDark
                                : AppColors.bgLightSecondary,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: _buildSegmentButton(
                                  index: 0,
                                  title: 'كود الطالب (Access Code)',
                                  icon: Icons.vpn_key_outlined,
                                  isSelected: _loginMode == 0,
                                ),
                              ),
                              Expanded(
                                child: _buildSegmentButton(
                                  index: 1,
                                  title: 'رقم الهاتف المسجل',
                                  icon: Icons.phone_iphone_outlined,
                                  isSelected: _loginMode == 1,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // 4. Error Message (if any)
                      if (authVm.errorMessage != null)
                        FadeSlideTransition(
                          duration: const Duration(milliseconds: 200),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.rose.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.rose.withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline_rounded, color: AppColors.rose, size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    authVm.errorMessage!,
                                    style: const TextStyle(
                                      color: AppColors.rose,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                      // 5. Input Fields
                      FadeSlideTransition(
                        delay: const Duration(milliseconds: 140),
                        child: _loginMode == 0
                            ? TextFormField(
                                controller: _codeController,
                                textCapitalization: TextCapitalization.characters,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.2,
                                  color: isDark ? AppColors.textDark : AppColors.textLight,
                                ),
                                decoration: InputDecoration(
                                  labelText: 'كود الطالب',
                                  hintText: 'مثال: LD824C',
                                  prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
                                  suffixIcon: _codeController.text.isNotEmpty
                                      ? IconButton(
                                          icon: const Icon(Icons.clear_rounded, size: 18),
                                          onPressed: () => setState(() => _codeController.clear()),
                                        )
                                      : null,
                                ),
                                validator: (v) =>
                                    v == null || v.trim().isEmpty ? 'يرجى كتابة كود الطالب' : null,
                              )
                            : Column(
                                children: [
                                  TextFormField(
                                    controller: _phoneController,
                                    keyboardType: TextInputType.phone,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: isDark ? AppColors.textDark : AppColors.textLight,
                                    ),
                                    decoration: const InputDecoration(
                                      labelText: 'رقم هاتف الطالب',
                                      hintText: '01xxxxxxxxx',
                                      prefixIcon: Icon(Icons.phone_outlined, size: 20),
                                    ),
                                    validator: (v) =>
                                        v == null || v.trim().isEmpty ? 'يرجى إدخال رقم الهاتف' : null,
                                  ),
                                  const SizedBox(height: 12),
                                  TextFormField(
                                    controller: _codeController,
                                    textCapitalization: TextCapitalization.characters,
                                    decoration: const InputDecoration(
                                      labelText: 'كود الطالب (اختياري)',
                                      hintText: 'كود الدخول إن وجد',
                                      prefixIcon: Icon(Icons.vpn_key_outlined, size: 20),
                                    ),
                                  ),
                                ],
                              ),
                      ),

                      const SizedBox(height: 24),

                      // 6. Primary Action Button
                      FadeSlideTransition(
                        delay: const Duration(milliseconds: 180),
                        child: PrimaryButton(
                          title: 'تسجيل الدخول',
                          icon: const Icon(Icons.login_rounded, size: 18, color: Colors.white),
                          isLoading: authVm.status == AuthStatus.loading,
                          onPressed: _handleLogin,
                        ),
                      ),

                      const SizedBox(height: 14),

                      // 7. Guest Exploration Button
                      FadeSlideTransition(
                        delay: const Duration(milliseconds: 220),
                        child: OutlinedButton(
                          onPressed: _enterAsGuestDemo,
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            side: BorderSide(
                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                              width: 1.2,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.explore_outlined,
                                size: 17,
                                color: isDark ? AppColors.textDarkSecondary : AppColors.textLightSecondary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'دخول تجريبي (استكشاف كطالب زائر)',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12.5,
                                  color: isDark ? AppColors.textDarkSecondary : AppColors.textLightSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 28),

                      // 8. Support Contact
                      FadeSlideTransition(
                        delay: const Duration(milliseconds: 260),
                        child: Center(
                          child: TextButton.icon(
                            onPressed: _contactSupport,
                            icon: const Icon(
                              Icons.headset_mic_outlined,
                              size: 16,
                              color: AppColors.textDarkMuted,
                            ),
                            label: const Text(
                              'نسيت كودك أو تواجه مشكلة؟ تواصل مع المساعد',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textDarkMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSegmentButton({
    required int index,
    required String title,
    required IconData icon,
    required bool isSelected,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => setState(() => _loginMode = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.cardDarkElevated : Colors.white)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: isSelected
              ? Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  width: 1,
                )
              : null,
          boxShadow: [
            if (isSelected)
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected
                  ? (isDark ? AppColors.textDark : AppColors.primary)
                  : (isDark ? AppColors.textDarkMuted : AppColors.textLightMuted),
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected
                      ? (isDark ? AppColors.textDark : AppColors.textLight)
                      : (isDark ? AppColors.textDarkMuted : AppColors.textLightMuted),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
