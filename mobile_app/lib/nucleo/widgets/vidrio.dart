import 'package:flutter/material.dart';

/// Liquid Glass (estilo iOS 26) solo en iPhone. En Android la app se queda
/// con su diseño de siempre, que es el que pide Material.
///
/// Para apagarlo en un build de iOS (por ejemplo, si un iPhone viejo va lento):
///   flutter run --dart-define=SIN_VIDRIO=true
const bool _sinVidrio = bool.fromEnvironment('SIN_VIDRIO');

bool usaVidrio(BuildContext context) =>
    !_sinVidrio && Theme.of(context).platform == TargetPlatform.iOS;
