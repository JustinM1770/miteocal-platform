/// Directorio de emergencia.
/// Documento: municipios/{municipioId}/config/emergencias → campo `lista`.
class ContactoEmergencia {
  const ContactoEmergencia({
    required this.id,
    required this.nombre,
    this.telefono,
  });

  final String id;
  final String nombre;

  /// null mientras el ayuntamiento no confirme el numero. Un telefono de
  /// emergencia equivocado es peor que no tenerlo.
  final String? telefono;

  factory ContactoEmergencia.desdeMapa(Map<String, dynamic> m) {
    final tel = (m['telefono'] as String?)?.trim();
    return ContactoEmergencia(
      id: (m['id'] as String?) ?? '',
      nombre: (m['nombre'] as String?) ?? '',
      telefono: tel == null || tel.isEmpty || tel == 'TODO' ? null : tel,
    );
  }
}
