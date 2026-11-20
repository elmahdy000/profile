import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:student_app/core/constants/app_colors.dart';

class LearningDocument {
  const LearningDocument({
    required this.id,
    required this.title,
    required this.category,
    required this.stage,
    required this.unit,
    required this.size,
    required this.pages,
    required this.downloadUrl,
    this.isExamBank = false,
  });

  final int id;
  final String title;
  final String category; // 'ملازم الشرح', 'خرائط مفاهيم', 'بنك أسئلة', 'ملخصات'
  final String stage;
  final String unit;
  final String size;
  final int pages;
  final String downloadUrl;
  final bool isExamBank;
}

class FilesView extends StatefulWidget {
  const FilesView({super.key});

  @override
  State<FilesView> createState() => _FilesViewState();
}

class _FilesViewState extends State<FilesView> {
  String _searchQuery = '';
  String _selectedCategory = 'الكل';
  final _searchController = TextEditingController();

  final List<String> _categories = [
    'الكل',
    'ملازم الشرح',
    'خرائط مفاهيم',
    'بنك أسئلة',
    'ملخصات',
  ];

  static const List<LearningDocument> _documents = [
    LearningDocument(
      id: 18,
      title: 'الكتاب المدرسي: البرمجة والذكاء الاصطناعي - الجزء الأول',
      category: 'ملازم الشرح',
      stage: 'الصف الثاني الثانوي',
      unit: 'منهج البكالوريا',
      size: '12.4 MB',
      pages: 120,
      downloadUrl: 'https://drelmahdy.com/api/learning-files/18/download',
    ),
    LearningDocument(
      id: 19,
      title: 'ملزمة التقييمات والاختبارات: البرمجة والذكاء الاصطناعي',
      category: 'بنك أسئلة',
      stage: 'الصف الثاني الثانوي',
      unit: 'شامل المنهج',
      size: '8.1 MB',
      pages: 64,
      downloadUrl: 'https://drelmahdy.com/api/learning-files/19/download',
      isExamBank: true,
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _openDocument(LearningDocument doc) async {
    final uri = Uri.parse(doc.downloadUrl);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.blue,
            content: Text('جارٍ فتح ملف: ${doc.title}'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _documents.where((doc) {
      final matchesCategory = _selectedCategory == 'الكل' || doc.category == _selectedCategory;
      final matchesSearch = _searchQuery.isEmpty ||
          doc.title.contains(_searchQuery) ||
          doc.stage.contains(_searchQuery) ||
          doc.unit.contains(_searchQuery);
      return matchesCategory && matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Blue Curved Header ──
            Container(
              padding: EdgeInsets.fromLTRB(
                18,
                MediaQuery.of(context).padding.top + 14,
                18,
                20,
              ),
              decoration: BoxDecoration(
                color: AppColors.blue,
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(AppColors.radiusHero),
                ),
                boxShadow: AppColors.heroShadow,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'مكتبة الملفات والملازم',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'مذكرات وخرائط ذهنية وبنوك أسئلة',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Colors.white70,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(11),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.38),
                          width: 1,
                        ),
                      ),
                      child: const Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── Content ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Search Box
                  Container(
                    height: 43,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(13),
                      border: Border.all(color: const Color(0xFFDBE7F5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.search_rounded, color: AppColors.blue, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            onChanged: (v) => setState(() => _searchQuery = v.trim()),
                            style: const TextStyle(fontSize: 11.5, color: AppColors.ink),
                            decoration: const InputDecoration(
                              hintText: 'ابحث باسم المذكرة أو الوحدة أو الدرس',
                              hintStyle: TextStyle(fontSize: 11.5, color: Color(0xFF9AACC2)),
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              contentPadding: EdgeInsets.zero,
                              isDense: true,
                            ),
                          ),
                        ),
                        if (_searchQuery.isNotEmpty)
                          InkWell(
                            onTap: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                            child: const Icon(Icons.clear_rounded, size: 16, color: Color(0xFF9AACC2)),
                          ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Category Chips
                  SizedBox(
                    height: 34,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _categories.length,
                      separatorBuilder: (context, index) => const SizedBox(width: 7),
                      itemBuilder: (context, index) {
                        final cat = _categories[index];
                        final isSelected = cat == _selectedCategory;
                        return InkWell(
                          onTap: () => setState(() => _selectedCategory = cat),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.blue : Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected ? AppColors.blue : const Color(0xFFD8E4F2),
                              ),
                            ),
                            child: Text(
                              cat,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? Colors.white : const Color(0xFF66809F),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Count Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${filtered.length} ملفات متاحة',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: AppColors.ink,
                        ),
                      ),
                      const Text(
                        'الملفات الدراسية',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors.muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 11),

                  // Documents List
                  if (filtered.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      alignment: Alignment.center,
                      child: const Text(
                        'مفيش ملفات مطابقة للبحث الحالي',
                        style: TextStyle(fontSize: 12, color: Color(0xFF8B9DB5)),
                      ),
                    )
                  else
                    ...filtered.map((doc) => _buildDocumentCard(doc)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentCard(LearningDocument doc) {
    final isPink = doc.isExamBank;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppColors.radiusCard),
        border: Border.all(color: AppColors.line),
        boxShadow: AppColors.cardShadow,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Doc Icon
          Container(
            width: 43,
            height: 47,
            decoration: BoxDecoration(
              color: isPink ? const Color(0xFFFFF0F0) : const Color(0xFFEAF3FF),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Center(
              child: Icon(
                isPink ? Icons.assignment_outlined : Icons.description_outlined,
                color: isPink ? const Color(0xFFDD5E68) : AppColors.blue,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 10),
          // Body
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  doc.title,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.ink,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 5),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.soft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    doc.stage,
                    style: const TextStyle(
                      fontSize: 8.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.blueDark,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${doc.pages} صفحة · ${doc.size} · PDF',
                  style: const TextStyle(
                    fontSize: 9.5,
                    color: Color(0xFF8797AC),
                  ),
                ),
              ],
            ),
          ),
          // Download Button
          InkWell(
            onTap: () => _openDocument(doc),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F6FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Center(
                child: Icon(
                  Icons.arrow_downward_rounded,
                  color: AppColors.blueDark,
                  size: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
