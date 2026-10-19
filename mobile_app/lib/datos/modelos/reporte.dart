/// Tipos de reporte. Los valores (`bache`, `fuga`...) son los mismos que usa
/// el panel (panel_nodex/lib/datos.ts → TipoReporte): no cambiarlos.
enum TipoReporte {
  bache('Bache'),
  fuga('Fuga de agua'),
  luminaria('Luminaria'),
  basura('Basura'),
  drenaje('Drenaje'),
  otro('Otro');

  const TipoReporte(this.etiqueta);
  final String etiqueta;
}

/// Lo que llena el vecino antes de enviar.
class NuevoReporte {
  const NuevoReporte({
    required this.tipo,
    required this.coloniaId,
    this.descripcion = '',
    this.fotoJpeg,
    this.lat,
    this.lng,
  });

  final TipoReporte tipo;
  final String coloniaId;
  final String descripcion;

  /// JPEG ya reducido en el telefono (~1000 px). Sin Storage (plan gratis),
  /// se guarda dentro del documento, que admite hasta 1 MB.
  final List<int>? fotoJpeg;
  final double? lat;
  final double? lng;
}

/// Reporte ya registrado, con su folio de seguimiento.
class Reporte {
  const Reporte({
    required this.folio,
    required this.tipo,
    required this.colonia,
    required this.estado,
    required this.creadoEn,
  });

  final String folio;
  final TipoReporte tipo;

  /// Nombre de la colonia, como lo muestra el panel.
  final String colonia;

  /// 'recibido' | 'en_proceso' | 'resuelto'
  final String estado;
  final DateTime creadoEn;
}
