/// Estado del servicio de agua de un dia.
/// Documento: municipios/{municipioId}/agua/{yyyy-mm-dd}
class EstadoAgua {
  const EstadoAgua({
    required this.horario,
    required this.presion,
    required this.calidad,
    required this.cobertura,
    required this.activo,
  });

  final String horario;
  final double presion;
  final String calidad;
  final String cobertura;
  final bool activo;

  factory EstadoAgua.desdeMapa(Map<String, dynamic> m) {
    return EstadoAgua(
      horario: (m['horario'] as String?) ?? '',
      presion: (m['presion'] as num?)?.toDouble() ?? 0,
      calidad: (m['calidad'] as String?) ?? '',
      cobertura: (m['cobertura'] as String?) ?? '',
      activo: (m['estado'] as String?) != 'sin-servicio',
    );
  }
}
