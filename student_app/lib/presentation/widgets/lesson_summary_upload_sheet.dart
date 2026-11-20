import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/presentation/widgets/primary_button.dart';

class LessonSummaryUploadSheet extends StatefulWidget {
  const LessonSummaryUploadSheet({
    required this.lessonTitle,
    super.key,
  });

  final String lessonTitle;

  static Future<void> show(BuildContext context, {required String lessonTitle}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => LessonSummaryUploadSheet(lessonTitle: lessonTitle),
    );
  }

  @override
  State<LessonSummaryUploadSheet> createState() => _LessonSummaryUploadSheetState();
}

class _LessonSummaryUploadSheetState extends State<LessonSummaryUploadSheet> {
  final List<XFile> _selectedImages = [];
  final TextEditingController _notesController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  bool _isUploading = false;

  Future<void> _pickImage(ImageSource source) async {
    try {
      if (source == ImageSource.camera) {
        final photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
        if (photo != null) {
          setState(() {
            _selectedImages.add(photo);
          });
        }
      } else {
        final images = await _picker.pickMultiImage(imageQuality: 85);
        if (images.isNotEmpty) {
          setState(() {
            _selectedImages.addAll(images);
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('تعذر اختيار الصورة: $e')),
        );
      }
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
  }

  Future<void> _submitUpload() async {
    if (_selectedImages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى التقاط أو اختيار صورة واحدة على الأقل من الكشكول')),
      );
      return;
    }

    setState(() => _isUploading = true);

    // Simulate reliable upload to teacher
    await Future.delayed(const Duration(seconds: 2));

    if (mounted) {
      setState(() => _isUploading = false);
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.emerald,
          content: Text('تم إرسال ${_selectedImages.length} صور من كشكول الملخص للمعلم بنجاح'),
        ),
      );
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: bottomInset + 20,
      ),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 48,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Row(
              children: [
                Icon(Icons.menu_book_rounded, color: AppColors.primary, size: 22),
                SizedBox(width: 8),
                Text(
                  'رفع كشكول ملخص الدرس',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'الدرس: ${widget.lessonTitle}',
              style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurface.withValues(alpha: 0.7)),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.amber.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.amber.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: AppColors.amberDark, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'صوّر صفحات كشكولك بوضوح ليرى المعلم والمشرف تلخيصك ويدوّن ملاحظاته.',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isUploading ? null : () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt_rounded),
                    label: const Text('التقاط بالكاميرا'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isUploading ? null : () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library_rounded),
                    label: const Text('من المعرض'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_selectedImages.isNotEmpty) ...[
              SizedBox(
                height: 100,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _selectedImages.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (ctx, idx) {
                    final img = _selectedImages[idx];
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: kIsWeb
                              ? Image.network(
                                  img.path,
                                  width: 100,
                                  height: 100,
                                  fit: BoxFit.cover,
                                )
                              : Image.file(
                                  File(img.path),
                                  width: 100,
                                  height: 100,
                                  fit: BoxFit.cover,
                                ),
                        ),
                        Positioned(
                          top: 4,
                          left: 4,
                          child: GestureDetector(
                            onTap: () => _removeImage(idx),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.close, color: Colors.white, size: 14),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
            ],
            TextField(
              controller: _notesController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'ملاحظة للمعلم (اختياري)...',
                hintStyle: const TextStyle(fontSize: 12),
                filled: true,
                fillColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              title: _isUploading
                  ? 'جارٍ الرفع...'
                  : 'تأكيد وإرسال كشكول الملخص للمعلم',
              isLoading: _isUploading,
              onPressed: _isUploading ? null : _submitUpload,
            ),
          ],
        ),
      ),
    );
  }
}
