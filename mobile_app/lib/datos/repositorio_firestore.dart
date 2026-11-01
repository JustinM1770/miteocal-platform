import 'dart:convert';
import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/painting.dart' show Color;

import 'modelos/agua.dart';
import 'modelos/colonia.dart';
import 'modelos/contacto.dart';
import 'modelos/contenido.dart';
import 'modelos/municipio.dart';
import 'modelos/noticia.dart';
import 'modelos/perfil.dart';
import 'modelos/reporte.dart';
import 'repositorio.dart';

/// Toda consulta parte de municipios/{municipioId}. Una consulta sin
/// municipio es una fuga de datos entre clientes — checklist de PRs,
/// seccion 8 del documento de arquitectura.
class RepositorioFirestore implements Repositorio {
  RepositorioFirestore({FirebaseFirestore? bd, String id = municipioId})
    : _bd = bd ?? FirebaseFirestore.instance,
      _id = id;

  final FirebaseFirestore _bd;
  String _id;
  String get id => _id;

  @override
  void cambiarMunicipio(String nuevoId) {
    _id = nuevoId;
  }

  @override
  Future<List<Municipio>> municipiosDisponibles() async {
    try {
      final q = await _bd.collection('municipios').get();
      if (q.docs.isNotEmpty) {
        return q.docs.map((d) => Municipio.desdeMapa(d.id, d.data())).toList();
      }
    } catch (_) {}
    return const [
      Municipio(
        id: 'teocaltiche',
        nombre: 'Teocaltiche',
        estado: 'Jalisco',
        activo: true,
        modulos: {
          'agua': true,
          'noticias': true,
          'reportes': true,
          'basura': true,
          'feria': true,
          'cierres': true,
          'escuelas': true,
          'paisanos': true,
          'comercio': true,
        },
        tema: TemaMunicipio(
          primary: Color(0xFF1552E0),
          primarySoft: Color(0xFFEDF2FE),
          success: Color(0xFF12A150),
          danger: Color(0xFFD93A3A),
        ),
      ),
    ];
  }

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

  // ── Pantallas de contenido. Las colecciones que ya publica el panel se
  // leen; las demas devuelven vacio hasta que el panel las tenga (la pantalla
  // muestra su estado vacio).

  Future<List<T>> _coleccion<T>(
    String nombre,
    T Function(String, Map<String, dynamic>) crear, {
    int max = 50,
  }) async {
    final q = await _raiz.collection(nombre).limit(max).get();
    return q.docs.map((d) => crear(d.id, d.data())).toList();
  }

  @override
  Future<List<Comercio>> comercios() async => (await _coleccion(
    'comercios',
    Comercio.desdeMapa,
  )).where((c) => c.nombre.isNotEmpty).toList();

  @override
  Future<List<EventoFeria>> eventosFeria() async =>
      (await _coleccion('eventos', EventoFeria.desdeMapa, max: 200))
        ..sort((a, b) => a.fecha.compareTo(b.fecha));

  @override
  Future<List<Cierre>> cierres() => _coleccion('obras', Cierre.desdeMapa);

  // TODO(panel): avisos parroquiales, esquelas, vacantes y clasificados no
  // tienen coleccion todavia.
  @override
  Future<List<AvisoParroquial>> avisosParroquiales() async => const [];
  @override
  Future<List<Esquela>> esquelas() async => const [];
  @override
  Future<List<Vacante>> vacantes() async => const [];
  @override
  Future<List<Clasificado>> clasificados() async => const [];

  // TODO(feria): la compra simulada escribe en pagos/ con canal 'simulacion'
  // (ver firestore.rules); requiere la sesion de Firebase Auth.
  @override
  Future<Pase> comprarBoleto(EventoFeria evento, Perfil comprador) =>
      Future.error(
        UnsupportedError(
          'La compra de boletos con Firebase aún no está conectada.',
        ),
      );
  @override
  Future<List<Pase>> misPases(Perfil vecino) async => const [];

  @override
  Future<List<Candidata>> candidatas(String certamen) async {
    final q = await _raiz
        .collection('candidatas')
        .where('certamen', isEqualTo: certamen)
        .get();
    return q.docs.map((d) => Candidata.desdeMapa(d.id, d.data())).toList();
  }

  /// votos/{certamen}_{uid}: el id fijo garantiza un voto por vecino.
  /// TODO: requiere Firebase Auth (las reglas validan el uid).
  @override
  Future<void> votar(Candidata candidata, Perfil vecino) =>
      _raiz.collection('votos').doc('${candidata.certamen}_${vecino.uid}').set({
        'certamen': candidata.certamen,
        'candidataId': candidata.id,
        'uid': vecino.uid,
        'colonia': vecino.coloniaId,
        'creadoEn': FieldValue.serverTimestamp(),
      });

  @override
  Future<String?> miVoto(String certamen, Perfil vecino) async {
    final s = await _raiz
        .collection('votos')
        .doc('${certamen}_${vecino.uid}')
        .get();
    return s.data()?['candidataId'] as String?;
  }

  @override
  Future<Transmision?> transmisionEnVivo() async => null;
  @override
  Future<ComunidadPaisana?> comunidadPaisana() async => null;

  @override
  Future<List<PasoBitacora>> bitacoraAgua() async {
    final s = await _raiz.collection('agua').doc(hoy()).get();
    final incidencias = (s.data()?['incidencias'] as List?) ?? const [];
    return [
      for (final i in incidencias.whereType<Map>())
        PasoBitacora(
          hora: (i['hora'] as String?) ?? '',
          titulo: (i['titulo'] as String?) ?? '',
          detalle: (i['mensaje'] as String?) ?? '',
        ),
    ];
  }

  @override
  Future<List<CorteProgramado>> cortesProgramados() async => const [];

  @override
  Future<RutaBasura?> rutaBasura(String coloniaId) async => null;

  @override
  Future<List<Escuela>> escuelas() async => const [];
  @override
  Future<List<AvisoEscolar>> avisosEscolares() async => const [];
}
