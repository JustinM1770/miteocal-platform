import 'package:cloud_firestore/cloud_firestore.dart';
import 'modelos/agua.dart';
import 'modelos/municipio.dart';

/// Cual municipio atiende este build. Es el unico valor de arranque que la
/// app conoce; todo lo demas —nombre, colores, modulos— sale de Firestore.
///
///   flutter run --dart-define=MUNICIPIO_ID=villa-hidalgo
const String municipioId =
    String.fromEnvironment('MUNICIPIO_ID', defaultValue: 'teocaltiche');

String _hoy() {
  final d = DateTime.now();
  final mes = d.month.toString().padLeft(2, '0');
  final dia = d.day.toString().padLeft(2, '0');
  return '${d.year}-$mes-$dia';
}

/// Toda consulta parte de municipios/{municipioId}. Una consulta sin
/// municipio es una fuga de datos entre clientes — checklist de PRs,
/// seccion 8 del documento de arquitectura.
class Repositorio {
  Repositorio({FirebaseFirestore? bd, this.id = municipioId})
      : _bd = bd ?? FirebaseFirestore.instance;

  final FirebaseFirestore _bd;
  final String id;

  DocumentReference<Map<String, dynamic>> get _raiz =>
      _bd.collection('municipios').doc(id);

  /// El municipio es legible sin sesion: la app necesita nombre, escudo y
  /// tema antes de que nadie se registre.
  Stream<Municipio?> municipio() {
    return _raiz.snapshots().map(
          (s) => s.exists ? Municipio.desdeMapa(s.id, s.data()!) : null,
        );
  }

  /// Estado del agua de hoy. Devuelve null si el municipio todavia no lo
  /// publico — la pantalla debe saber verse bien sin dato.
  Stream<EstadoAgua?> aguaDeHoy() {
    return _raiz.collection('agua').doc(_hoy()).snapshots().map(
          (s) => s.exists ? EstadoAgua.desdeMapa(s.data()!) : null,
        );
  }
}
