import 'package:flutter/material.dart';

Widget buildYouTubeIframe({required String videoId, required String title}) {
  return Container(
    color: const Color(0xFF0F172A),
    child: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.play_circle_fill_rounded, color: Colors.white, size: 54),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(color: Colors.white, fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );
}
