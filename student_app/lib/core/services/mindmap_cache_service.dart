import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class MindmapCacheService {
  static Directory? _cacheDir;
  static final Set<String> _downloadingUrls = {};
  static final Map<String, File> _memoryIndex = {};

  /// All 65 mindmaps pre-bundled in assets for 100% offline, 0ms instant display
  static const Set<String> bundledMindmaps = {
    '01678974-75bf-4a90-98eb-1836e9c8bbc7.png',
    '040f5064-e502-4a98-a98e-89a9ce6b44b7.png',
    '0c2d1244-9a73-47ad-948e-2ccf07a58614.png',
    '111798e4-4eb4-482d-be87-2325c837065c.png',
    '2e0c3e9d-aba6-4a48-a1c1-5a15b7c7312e.png',
    '331ef94d-9469-4a04-9cf4-33ae4acac4f2.png',
    '33723f6f-ad51-403a-a481-d05f20c6da95.png',
    '3496cee2-c00c-4157-a26e-e8ae9570158c.png',
    '374c8d2d-31b8-4f80-89f5-0cd58aab86ed.png',
    '381a43ea-f065-4b23-be44-ad0c29619c8d.png',
    '4a71e7c6-393c-488d-82de-dea969f107f4.png',
    '546b828e-b08e-41e6-99cd-1477fb6e00d7.png',
    '55f01674-1392-4fb0-9ce1-6a04b823be08.png',
    '566ff9d0-a978-4e8d-a690-aebe1bfbf170.png',
    '58b527c5-91e2-46fb-8b95-fe5a6463d8fc.png',
    '58fc739e-703c-4e2e-94ce-61d4003e24f4.png',
    '5e7d94b5-69df-4449-bcff-733b19c69f11.png',
    '624e5dcf-387f-4dce-ac4a-c0e0c1cd3e71.png',
    '6b6f1432-bfee-4de6-ac29-c375f3e40834.png',
    '72041d2c-e735-4b4a-9520-7b9eb7fb5e53.png',
    '7cf1dfb7-00d3-4243-873d-ef8b4dae50dd.png',
    '848efb44-bc49-4825-8fe0-a6016d5cf328.png',
    '8ce3b30f-fe82-4c13-a9f7-ea36e2fb6ca2.png',
    '916978ea-0c5f-41c0-8bf6-ad25445a211c.png',
    '94124ff2-8c93-4188-bd3c-12363103ef9c.png',
    '94a5136a-ecdd-41fc-8e16-a2b4b69a03fb.png',
    '94b9f2cd-a057-4d2a-92b5-0d1c9a469df4.png',
    '95253cb3-5c48-4788-8f6b-5f6d88d8adc7.png',
    '9ad6d326-a475-497b-93c1-f3dea3fedcde.png',
    '9f3c7187-14d8-4776-ab73-ea004e8fa5c2.png',
    'a56f78f6-17cc-442e-8129-2771e5241c33.png',
    'a9071fc1-814f-471b-8ec9-88d8e15d50e3.png',
    'ab0b6bf9-7088-4579-8eb8-1698e1aef207.png',
    'b16d66c8-e9dd-4cc3-9f74-e619273a6c88.png',
    'b32ee423-876f-455f-80dd-99d61935d801.png',
    'b44fff37-ceb8-46fa-a3ac-31b39ebeb3dd.png',
    'b4b6ce49-2e74-4b08-b5bb-ef7a693f0962.png',
    'b5af3cbd-6132-4254-b9e1-e72275594795.png',
    'b7c70561-5d7d-45c4-89be-f5cdfeefa420.png',
    'c5969428-859b-4cfe-bbe5-7e8357164034.png',
    'c7bba0c1-1603-404a-9597-bc849a778061.png',
    'ca78fce1-d391-469d-a01b-5efc3a08351f.png',
    'ca906c8e-1e55-4206-89b8-4d8bff07c23a.png',
    'cb6c3398-f15a-4ddf-82da-215db17a577c.png',
    'cb9c439e-d65a-4c14-9b1f-6e7678f1b613.png',
    'cc55fbc7-d436-49a0-b1da-9a57f2fdb5fa.png',
    'ce8281cb-553f-4c91-913c-d031046c9d6e.png',
    'cf55ce78-ad99-4503-bed2-f17c2359aa19.png',
    'd027df7b-13dc-4f3d-9c75-8270423ae416.png',
    'd056958f-b10f-4d41-bd2e-997c3348a13e.png',
    'd7ce8ffc-e955-412c-9e80-e3402aa5d027.png',
    'd91d6936-8ba8-4aeb-92d9-8cf49f164cf5.png',
    'dbd60012-289e-4939-a615-c3c2eeb0eaaf.png',
    'dd071d7d-ed2c-4405-af90-06647bb5287c.png',
    'ddbe147b-efeb-4e39-bc44-a6e7a6eabf9e.png',
    'e1097003-68f6-4d3d-93f7-b98183c7c885.png',
    'e16d060c-1fe5-4b0f-a197-bc02143443db.png',
    'eae85903-2a11-4d99-ac23-91607851c10d.png',
    'efc8cbba-c1c4-4c08-86f5-0898d4217f6f.png',
    'f03fa461-5da5-4a9f-8a65-e8be8f1b18d6.png',
    'f113ca1d-e186-4e23-9bb1-adcbf7a674bb.png',
    'f33ac55a-d8f3-4228-a781-eebbb60e0fb2.png',
    'f51fbbc3-5834-4c0b-b390-b15fd5a4ba1c.png',
    'f78819b1-2727-4ffc-8dc6-ac98cdd9cf8d.png',
    'f980bdf7-2e05-47fe-95c4-b0cc69662b56.png',
  };

  /// Dedicated CacheManager with 90-day disk persistence and LRU eviction
  static final CacheManager customCacheManager = CacheManager(
    Config(
      'mindmaps_cache_v2',
      stalePeriod: const Duration(days: 90),
      maxNrOfCacheObjects: 200,
    ),
  );

  static Future<void> init() async {
    try {
      final docs = await getApplicationDocumentsDirectory();
      _cacheDir = Directory('${docs.path}/mindmaps_cache');
      if (!await _cacheDir!.exists()) {
        await _cacheDir!.create(recursive: true);
      }
      await _indexExistingFiles();
    } catch (e) {
      debugPrint('MindmapCacheService init error: $e');
    }
  }

  static Future<void> _indexExistingFiles() async {
    if (_cacheDir == null || !await _cacheDir!.exists()) return;
    try {
      final entities = _cacheDir!.listSync();
      for (final e in entities) {
        if (e is File && e.path.endsWith('.png') && e.lengthSync() > 1000) {
          final fname = e.uri.pathSegments.last;
          _memoryIndex[fname] = e;
        }
      }
      debugPrint('MindmapCacheService: ${_memoryIndex.length} mindmaps indexed in local cache.');
    } catch (_) {}
  }

  static String getFilenameFromUrl(String url) {
    final clean = url.split('?').first.trim();
    return clean.split('/').last;
  }

  /// Returns bundled asset path if this mindmap is packaged in the APK (0ms load)
  static String? getBundledAssetPath(String url) {
    if (url.isEmpty) return null;
    final fname = getFilenameFromUrl(url);
    if (bundledMindmaps.contains(fname)) {
      return 'assets/mindmaps/$fname';
    }
    return null;
  }

  /// Returns cached file immediately if it exists on disk, else null
  static File? getCachedFile(String url) {
    if (url.isEmpty) return null;
    final fname = getFilenameFromUrl(url);
    final inMemory = _memoryIndex[fname];
    if (inMemory != null && inMemory.existsSync() && inMemory.lengthSync() > 1000) {
      return inMemory;
    }
    if (_cacheDir == null) return null;
    final file = File('${_cacheDir!.path}/$fname');
    if (file.existsSync() && file.lengthSync() > 1000) {
      _memoryIndex[fname] = file;
      return file;
    }
    return null;
  }

  /// Fetches an image, writes to disk cache, and returns File
  static Future<File?> fetchAndCache(String url, {Map<String, String>? headers}) async {
    if (url.isEmpty) return null;
    final existing = getCachedFile(url);
    if (existing != null) return existing;

    final fname = getFilenameFromUrl(url);
    if (_downloadingUrls.contains(fname)) {
      for (int i = 0; i < 40; i++) {
        await Future.delayed(const Duration(milliseconds: 100));
        final f = getCachedFile(url);
        if (f != null) return f;
      }
    }

    _downloadingUrls.add(fname);
    try {
      final response = await http.get(Uri.parse(url), headers: headers);
      if (response.statusCode == 200 && response.bodyBytes.length > 1000) {
        if (_cacheDir == null) await init();
        final file = File('${_cacheDir!.path}/$fname');
        await file.writeAsBytes(response.bodyBytes, flush: true);
        _memoryIndex[fname] = file;
        debugPrint('MindmapCacheService: Successfully cached $fname (${response.bodyBytes.length} bytes)');
        return file;
      }
    } catch (e) {
      debugPrint('MindmapCacheService: Failed to fetch $url: $e');
    } finally {
      _downloadingUrls.remove(fname);
    }
    return null;
  }

  /// Prefetch list of images in background for instant opening
  static void prefetchUrls(List<String> urls, {Map<String, String>? headers, String Function(String)? urlResolver}) {
    for (final raw in urls) {
      final resolved = urlResolver != null ? urlResolver(raw) : raw;
      // Skip if already bundled in assets
      if (getBundledAssetPath(resolved) != null) continue;
      if (getCachedFile(resolved) == null) {
        fetchAndCache(resolved, headers: headers);
      }
    }
  }
}
