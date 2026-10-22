import 'package:flutter/services.dart';

/// Retroalimentación háptica centralizada.
///
/// Usa `HapticFeedback` de Flutter (sin paquete externo), que funciona en
/// Android e iOS sin permisos adicionales.
class Hapticos {
  const Hapticos._();

  /// Vibración de éxito: un golpe medio que confirma una acción completada
  /// (votar, apartar boleto, enviar reporte).
  static Future<void> exito() => HapticFeedback.mediumImpact();

  /// Toque ligero para interacciones menores (seleccionar, cambiar filtro).
  static Future<void> ligero() => HapticFeedback.lightImpact();

  /// Toque suave para selección de elementos.
  static Future<void> seleccion() => HapticFeedback.selectionClick();
}
