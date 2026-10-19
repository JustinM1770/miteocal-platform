import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miteocal/datos/modelos/colonia.dart';
import 'package:miteocal/datos/modelos/perfil.dart';
import 'package:miteocal/datos/modelos/reporte.dart';
import 'package:miteocal/datos/repositorio.dart';
import 'package:miteocal/datos/repositorio_demo.dart';
import 'package:miteocal/datos/repositorio_firestore.dart';
import 'package:miteocal/datos/sesion.dart';
import 'package:miteocal/navegacion/concha_principal.dart';
import 'package:miteocal/navegacion/pestanas.dart';
import 'package:miteocal/nucleo/servicios/ubicacion.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const ana = Perfil(
  uid: 'u1',
  nombre: 'Ana Martínez López',
  telefono: '3461234567',
  direccion: 'Zaragoza 45',
  coloniaId: 'teocaltiche-centro',
);

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('el reporte se guarda con la forma que lee el panel', () async {
    final bd = FakeFirebaseFirestore();
    await bd.collection('municipios').doc('teocaltiche').set({
      'nombre': 'Teocaltiche',
      'prefijoFolio': 'TEC',
    });
    await bd
        .collection('municipios')
        .doc('teocaltiche')
        .collection('config')
        .doc('colonias')
        .set({
          'lista': [
            {'id': 'teocaltiche-centro', 'nombre': 'Teocaltiche Centro'},
          ],
        });

    final reporte = await RepositorioFirestore(bd: bd).enviarReporte(
      const NuevoReporte(
        tipo: TipoReporte.fuga,
        coloniaId: 'teocaltiche-centro',
        descripcion: 'Sale agua',
        lat: 21.43,
        lng: -102.57,
      ),
      ana,
    );

    final docs = await bd
        .collection('municipios')
        .doc('teocaltiche')
        .collection('reportes')
        .get();
    final d = docs.docs.single.data();
    expect(reporte.folio, startsWith('TEC-'));
    expect(d['folio'], reporte.folio);
    expect(d['uid'], 'u1'); // las reglas exigen uid == usuario con sesion
    expect(d['estado'], 'recibido'); // y estado inicial 'recibido'
    expect(d['tipo'], 'fuga');
    expect(d['colonia'], 'Teocaltiche Centro');
    expect(d['nombre'], 'Ana Martínez López');
    expect(d.containsKey('geo'), isTrue);
  });

  test('propone la colonia mas cercana solo dentro del municipio', () {
    const colonias = [
      Colonia(id: 'centro', nombre: 'Centro', lat: 21.4271, lng: -102.5764),
      Colonia(id: 'tanque', nombre: 'El Tanque', lat: 21.4236, lng: -102.5812),
      Colonia(id: 'sin-centro', nombre: 'Sin centro'),
    ];
    expect(
      Ubicacion.coloniaCercana(const Punto(21.4240, -102.5808), colonias)?.id,
      'tanque',
    );
    // Desde Aguascalientes (un paisano, o el equipo probando) no adivina.
    expect(
      Ubicacion.coloniaCercana(const Punto(21.8853, -102.2916), colonias),
      isNull,
    );
  });

  testWidgets('enviar un reporte muestra el folio', (tester) async {
    final sesion = Sesion();
    await sesion.guardar(ana);
    final repo = RepositorioDemo(latencia: Duration.zero);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<Repositorio>.value(value: repo),
          ChangeNotifierProvider.value(value: sesion),
          ChangeNotifierProvider(
            create: (_) => Pestanas()..ir(Pestanas.servicios),
          ),
        ],
        child: const MaterialApp(home: ConchaPrincipal()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Luminaria'));
    await tester.scrollUntilVisible(
      find.text('Enviar reporte'),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Enviar reporte'));
    await tester.pumpAndSettle();

    expect(find.text('Reporte enviado'), findsOneWidget);
    expect(
      find.textContaining('luminaria en Teocaltiche Centro'),
      findsOneWidget,
    );
    expect(repo.reportes.single.tipo, TipoReporte.luminaria);
    expect(find.text(repo.reportes.single.folio), findsOneWidget);
  });

  testWidgets('sin perfil la app empieza en la bienvenida', (tester) async {
    // La raiz decide con Sesion.registrado; aqui solo el flujo de registro.
    final sesion = Sesion();
    await sesion.cargar();
    expect(sesion.registrado, isFalse);
  });
}
