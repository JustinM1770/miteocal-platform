import 'package:flutter/material.dart';
import 'colores.dart';
import 'tipografia.dart';

export 'colores.dart';
export 'medidas.dart';
export 'tipografia.dart';

/// Tema de la app.
///
/// Los cuatro colores de marca llegan como parametro porque los define el
/// municipio en su documento de configuracion, no el codigo. Mientras esa
/// configuracion carga se usan los valores de Teocaltiche como respaldo.
class TemaMiTeocal {
  const TemaMiTeocal._();

  static ThemeData claro({
    Color primary = Colores.primary,
    Color primarySoft = Colores.soft,
    Color success = Colores.exito,
    Color danger = Colores.peligro,
  }) {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: Colores.fondoPantalla,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        surface: Colores.fondoTarjeta,
        error: danger,
      ),
      textTheme: TextTheme(
        titleMedium: Tipografia.titulo,
        bodyMedium: Tipografia.cuerpo,
        labelMedium: Tipografia.subtitulo,
        labelSmall: Tipografia.micro,
      ),
      dividerTheme: const DividerThemeData(
        color: Colores.borde,
        thickness: 1,
        space: 1,
      ),
      cardTheme: CardThemeData(
        color: Colores.fondoTarjeta,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Colores.borde),
        ),
      ),
    );
  }
}
