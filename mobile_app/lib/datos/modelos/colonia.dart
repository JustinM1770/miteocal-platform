/// Colonia o barrio del municipio.
/// Documento: municipios/{municipioId}/config/colonias → campo `lista`.
class Colonia {
  const Colonia({
    required this.id,
    required this.nombre,
    this.zona = '',
    this.tipo = 'Colonia',
    this.lat,
    this.lng,
    this.horarioAgua = '',
    this.pozo = '',
    this.basura = '',
    this.escuelas = 0,
  });

  final String id;
  final String nombre;
  final String zona;
  final String tipo;

  /// Centroide. Lo marca el municipio en el panel; puede faltar.
  final double? lat;
  final double? lng;

  final String horarioAgua;
  final String pozo;

  /// "Martes y viernes, 7:00 hrs"
  final String basura;
  final int escuelas;

  bool get tieneCentro => lat != null && lng != null;

  factory Colonia.desdeMapa(Map<String, dynamic> m) {
    return Colonia(
      id: (m['id'] as String?) ?? '',
      nombre: (m['nombre'] as String?) ?? '',
      zona: (m['zona'] as String?) ?? '',
      tipo: (m['tipo'] as String?) ?? 'Colonia',
      lat: (m['lat'] as num?)?.toDouble(),
      lng: (m['lng'] as num?)?.toDouble(),
      horarioAgua: (m['horario'] as String?) ?? '',
      pozo: (m['pozo'] as String?) ?? '',
      basura: (m['basura'] as String?) ?? '',
      escuelas: (m['escuelas'] as num?)?.toInt() ?? 0,
    );
  }
}
