// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';

final Set<String> _registeredViews = <String>{};

Widget buildYouTubeIframe({required String videoId, required String title}) {
  final viewType = 'youtube-iframe-$videoId';

  if (!_registeredViews.contains(viewType)) {
    ui_web.platformViewRegistry.registerViewFactory(
      viewType,
      (int viewId) {
        final iframe = html.IFrameElement()
          ..src = 'https://www.youtube-nocookie.com/embed/$videoId?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=1&fs=1&iv_load_policy=3&hl=ar'
          ..style.border = 'none'
          ..style.width = '100%'
          ..style.height = '100%'
          ..allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'
          ..allowFullscreen = true;
        return iframe;
      },
    );
    _registeredViews.add(viewType);
  }

  return HtmlElementView(viewType: viewType);
}
