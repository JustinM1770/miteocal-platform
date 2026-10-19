import 'package:cloud_firestore/cloud_firestore.dart';

/// Documento: municipios/{municipioId}/noticias/{id}. Lo escribe el panel al
/// publicar (espejo de publicaciones/).
class Noticia {
  const Noticia({
    required this.id,
    required this.titulo,
    required this.categoria,
    required this.publicadaEn,
    this.cuerpo = '',
    this.imagen = '',
  });

  final String id;
  final String titulo;
  final String categoria;
  final DateTime publicadaEn;
  final String cuerpo;
  final String imagen;

  factory Noticia.desdeMapa(String id, Map<String, dynamic> m) {
    final fecha = m['publicadaEn'];
    return Noticia(
      id: id,
      titulo: (m['titulo'] as String?) ?? '',
      categoria: (m['categoria'] as String?) ?? '',
      cuerpo: (m['cuerpo'] as String?) ?? '',
      imagen: (m['imagen'] as String?) ?? '',
      publicadaEn: fecha is Timestamp ? fecha.toDate() : DateTime.now(),
    );
  }
}
