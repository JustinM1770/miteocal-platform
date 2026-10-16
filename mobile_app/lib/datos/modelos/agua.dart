/// Estado del servicio de agua de un dia.
/// Documento: municipios/{municipioId}/agua/{yyyy-mm-dd}
class EstadoAgua {
  const EstadoAgua({
    required this.horario,
    required this.presion,
    required this.calidad,
    required this.cobertura,
    required this.activo,
    this.sinDato = false,
    this.mensaje = '',
    this.horaEstimada,
  });

  final String horario;
  final double presion;
  final String calidad;
  final String cobertura;
  final bool activo;

  /// El panel publico "sin dato del pozo": no se sabe si hay agua. No es
  /// servicio activo ni corte, y la app no debe adivinar.
  final bool sinDato;

  /// Lo que escribio el municipio para los vecinos ("Falla en el pozo...").
  final String mensaje;

  /// "16:00" cuando hay corte con hora estimada de regreso; null si no se sabe.
  final String? horaEstimada;

  factory EstadoAgua.desdeMapa(Map<String, dynamic> m) {
    return EstadoAgua(
      horario: (m['horario'] as String?) ?? '',
      presion: (m['presion'] as num?)?.toDouble() ?? 0,
      calidad: (m['calidad'] as String?) ?? '',
      cobertura: (m['cobertura'] as String?) ?? '',
      // 'activo' | 'sin-servicio' | 'sin-dato' (panel). Sin campo = activo,
      // por compatibilidad con lo que ya escribia el admin_panel.
      activo: !const ['sin-servicio', 'sin-dato'].contains(m['estado']),
      sinDato: m['estado'] == 'sin-dato',
      mensaje: (m['mensaje'] as String?) ?? '',
      horaEstimada: m['horaEstimada'] as String?,
    );
  }
}
