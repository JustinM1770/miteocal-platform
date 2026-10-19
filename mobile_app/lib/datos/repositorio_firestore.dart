import 'dart:convert';
import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';

import 'modelos/agua.dart';
import 'modelos/colonia.dart';
import 'modelos/contacto.dart';
import 'modelos/municipio.dart';
import 'modelos/noticia.dart';
import 'modelos/perfil.dart';
import 'modelos/reporte.dart';
import 'repositorio.dart';

/// Toda consulta parte de municipios/{municipioId}. Una consulta sin
/// municipio es una fuga de datos entre clientes — checklist de PRs,
/// seccion 8 del documento de arquitectura.
class RepositorioFirestore implements Repositorio {
  RepositorioFirestore({FirebaseFirestore? bd, this.id = municipioId})
    : _bd = bd ?? FirebaseFirestore.instance;

  final FirebaseFirestore _bd;
  final String id;

  DocumentReference<Map<String, dynamic>> get _raiz =>
      _bd.collection('municipios').doc(id);

  /// El municipio es legible sin sesion: la app necesita nombre, escudo y
  /// tema antes de que nadie se registre.
  @override
  Stream<Municipio?> municipio() {
    return _raiz.snapshots().map(
      (s) => s.exists ? Municipio.desdeMapa(s.id, s.data()!) : null,
    );
  }

  @override
  Stream<EstadoAgua?> aguaDeHoy() {
    return _raiz
        .collection('agua')
        .doc(hoy())
        .snapshots()
        .map((s) => s.exists ? EstadoAgua.desdeMapa(s.data()!) : null);
  }

  Future<List<Map<String, dynamic>>> _lista(String doc) async {
    final s = await _raiz.collection('config').doc(doc).get();
    final lista = (s.data()?['lista'] as List?) ?? const [];
    return lista
        .whereType<Map>()
        .map((m) => m.cast<String, dynamic>())
        .toList();
  }

  @override
  Future<List<Colonia>> colonias() async =>
      (await _lista('colonias')).map(Colonia.desdeMapa).toList();

  @override
  Future<List<ContactoEmergencia>> emergencias() async =>
      (await _lista('emergencias')).map(ContactoEmergencia.desdeMapa).toList();

  @override
  Stream<List<Noticia>> noticias({int max = 10}) {
    return _raiz
        .collection('noticias')
        .orderBy('publicadaEn', descending: true)
        .limit(max)
        .snapshots()
        .map(
          (q) => q.docs.map((d) => Noticia.desdeMapa(d.id, d.data())).toList(),
        );
  }

  /// Escribe con la forma que lee el panel (normalizarReporte en
  /// panel_nodex/lib/datos.ts). Las reglas exigen `uid` == usuario con sesion
  /// y `estado` == 'recibido'.
  ///
  /// TODO: requiere Firebase Auth y el claim `municipioId` del vecino. Sin
  /// Cloud Functions (plan gratis), ese claim lo asigna una ruta del panel en
  /// Vercel con el Admin SDK.
  @override
  Future<Reporte> enviarReporte(NuevoReporte nuevo, Perfil autor) async {
    final mun = await _raiz.get();
    final prefijo = mun.exists
        ? Municipio.desdeMapa(mun.id, mun.data()!).prefijoFolio
        : 'MUN';
    final folio = '$prefijo-${1000 + Random().nextInt(9000)}';
    final colonias = await this.colonias();
    final colonia = colonias.where((c) => c.id == nuevo.coloniaId).firstOrNull;

    await _raiz.collection('reportes').add({
      'folio': folio,
      'uid': autor.uid,
      'nombre': autor.nombre,
      'telefono': autor.telefono,
      'tipo': nuevo.tipo.name,
      'descripcion': nuevo.descripcion,
      'colonia': colonia?.nombre ?? nuevo.coloniaId,
      'direccion': autor.direccion,
      if (nuevo.lat != null && nuevo.lng != null)
        'geo': GeoPoint(nuevo.lat!, nuevo.lng!),
      if (nuevo.fotoJpeg != null)
        'foto': 'data:image/jpeg;base64,${base64Encode(nuevo.fotoJpeg!)}',
      'estado': 'recibido',
      'historial': <Map<String, dynamic>>[],
      'creadoEn': FieldValue.serverTimestamp(),
    });

    return Reporte(
      folio: folio,
      tipo: nuevo.tipo,
      colonia: colonia?.nombre ?? nuevo.coloniaId,
      estado: 'recibido',
      creadoEn: DateTime.now(),
    );
  }
}
