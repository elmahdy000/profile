import 'package:flutter/widgets.dart';

/// Explicit, non-flipping directional icons for guaranteed consistent RTL/LTR rendering.
/// In Flutter 3.47+, standard MaterialIcons arrows have `matchTextDirection: true`
/// which automatically mirrors them in RTL, causing confusion between intentional
/// pointing direction and logical direction.
class AppIcons {
  AppIcons._();

  /// Always points strictly LEFT ( < )
  static const IconData chevronLeft = IconData(
    0xe15e,
    fontFamily: 'MaterialIcons',
    matchTextDirection: false,
  );

  /// Always points strictly RIGHT ( > )
  static const IconData chevronRight = IconData(
    0xe15f,
    fontFamily: 'MaterialIcons',
    matchTextDirection: false,
  );

  /// Always points strictly LEFT ( ← )
  static const IconData arrowLeft = IconData(
    0xe092,
    fontFamily: 'MaterialIcons',
    matchTextDirection: false,
  );

  /// Always points strictly RIGHT ( → ) - Standard Back button in Arabic RTL
  static const IconData arrowRight = IconData(
    0xe09b,
    fontFamily: 'MaterialIcons',
    matchTextDirection: false,
  );
}
