import 'package:flutter/material.dart';

/// Configuracion del municipio. Todo lo especifico de un ayuntamiento
/// —nombre, escudo, colores, modulos contratados— vive aqui, no en el codigo.
/// Ver docs/arquitectura-multimunicipio.md, reglas 2 y 3.
class Municipio {
  const Municipio({
    required this.id,
    required this.nombre,
    required this.estado,
    required this.activo,
    required this.modulos,
    required this.tema,
    this.escudo,
  });

  final String id;
  final String nombre;
  final String estado;
  final bool activo;
  final Map<String, bool> modulos;
  final TemaMunicipio tema;
  final String? escudo;

  /// Ningun modulo puede asumir que otro esta encendido. Ver seccion 3.
  bool tieneModulo(String nombre) => modulos[nombre] ?? false;

  factory Municipio.desdeMapa(String id, Map<String, dynamic> m) {
    return Municipio(
      id: id,
      nombre: (m['nombre'] as String?) ?? '',
      estado: (m['estado'] as String?) ?? '',
      activo: (m['activo'] as bool?) ?? false,
      modulos: ((m['modulos'] as Map?) ?? {}).map(
        (k, v) => MapEntry(k.toString(), v == true),
      ),
      tema: TemaMunicipio.desdeMapa((m['tema'] as Map?)?.cast<String, dynamic>() ?? {}),
      escudo: m['escudo'] as String?,
    );
  }
}

/// Los colores de marca son dato, no codigo (regla 3).
class TemaMunicipio {
  const TemaMunicipio({
    required this.primary,
    required this.primarySoft,
    required this.success,
    required this.danger,
  });

  final Color primary;
  final Color primarySoft;
  final Color success;
  final Color danger;

  factory TemaMunicipio.desdeMapa(Map<String, dynamic> m) {
    return TemaMunicipio(
      primary: _color(m['primary'], const Color(0xFF1552E0)),
      primarySoft: _color(m['primarySoft'], const Color(0xFFEDF2FE)),
      success: _color(m['success'], const Color(0xFF12A150)),
      danger: _color(m['danger'], const Color(0xFFD93A3A)),
    );
  }

  static Color _color(dynamic hex, Color porDefecto) {
    if (hex is! String) return porDefecto;
    final limpio = hex.replaceAll('#', '').trim();
    final valor = int.tryParse(limpio, radix: 16);
    if (valor == null) return porDefecto;
    return Color(limpio.length == 6 ? 0xFF000000 | valor : valor);
  }
}
