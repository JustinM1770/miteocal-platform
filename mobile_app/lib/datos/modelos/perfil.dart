/// Lo que el vecino captura al registrarse. Se guarda en el telefono y,
/// con Firebase, en usuarios/{uid} (sin `rol` ni `municipioId`: esos los
/// pone el servidor, ver firestore.rules).
class Perfil {
  const Perfil({
    required this.uid,
    required this.nombre,
    required this.telefono,
    required this.coloniaId,
    this.direccion = '',
  });

  final String uid;
  final String nombre;
  final String telefono;
  final String direccion;
  final String coloniaId;

  /// "Ana" de "Ana Martínez López"
  String get nombreCorto => nombre.trim().split(RegExp(r'\s+')).first;

  Perfil copiarCon({String? coloniaId, String? direccion}) => Perfil(
    uid: uid,
    nombre: nombre,
    telefono: telefono,
    direccion: direccion ?? this.direccion,
    coloniaId: coloniaId ?? this.coloniaId,
  );

  Map<String, dynamic> aMapa() => {
    'uid': uid,
    'nombre': nombre,
    'telefono': telefono,
    'direccion': direccion,
    'colonia': coloniaId,
  };

  factory Perfil.desdeMapa(Map<String, dynamic> m) => Perfil(
    uid: (m['uid'] as String?) ?? '',
    nombre: (m['nombre'] as String?) ?? '',
    telefono: (m['telefono'] as String?) ?? '',
    direccion: (m['direccion'] as String?) ?? '',
    coloniaId: (m['colonia'] as String?) ?? '',
  );
}
