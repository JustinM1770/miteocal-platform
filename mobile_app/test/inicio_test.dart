import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miteocal/datos/repositorio.dart';
import 'package:miteocal/pantallas/inicio_pagina.dart';

Future<FakeFirebaseFirestore> conMunicipio({
  Map<String, bool> modulos = const {'agua': true},
  Map<String, dynamic>? agua,
}) async {
  final bd = FakeFirebaseFirestore();
  await bd.collection('municipios').doc('teocaltiche').set({
    'nombre': 'Teocaltiche',
    'estado': 'Jalisco',
    'activo': true,
    'modulos': modulos,
    'tema': {'primary': '#1552E0'},
  });
  if (agua != null) {
    final d = DateTime.now();
    final fecha =
        '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    await bd
        .collection('municipios').doc('teocaltiche')
        .collection('agua').doc(fecha)
        .set(agua);
  }
  return bd;
}

Widget envolver(Repositorio repo) =>
    MaterialApp(home: Scaffold(body: InicioPagina(repositorio: repo)));

void main() {
  testWidgets('muestra el nombre del municipio que viene de Firestore',
      (tester) async {
    final bd = await conMunicipio();
    await tester.pumpWidget(envolver(Repositorio(bd: bd)));
    await tester.pumpAndSettle();

    expect(find.text('Teocaltiche'), findsOneWidget);
    expect(find.text('Jalisco'), findsOneWidget);
  });

  testWidgets('pinta el estado del agua del dia', (tester) async {
    final bd = await conMunicipio(agua: {
      'horario': '06:00 - 12:00',
      'presion': 2.4,
      'calidad': 'Potable',
      'cobertura': 'Total',
      'estado': 'activo',
    });
    await tester.pumpWidget(envolver(Repositorio(bd: bd)));
    await tester.pumpAndSettle();

    expect(find.text('06:00 - 12:00'), findsOneWidget);
    expect(find.text('2.4 bar'), findsOneWidget);
    expect(find.text('Servicio activo'), findsOneWidget);
  });

  testWidgets('sin dato de agua muestra un mensaje, no una tarjeta rota',
      (tester) async {
    final bd = await conMunicipio(); // sin documento de agua
    await tester.pumpWidget(envolver(Repositorio(bd: bd)));
    await tester.pumpAndSettle();

    expect(find.textContaining('aun no publica'), findsOneWidget);
  });

  testWidgets('marca el corte cuando no hay servicio', (tester) async {
    final bd = await conMunicipio(agua: {'estado': 'sin-servicio'});
    await tester.pumpWidget(envolver(Repositorio(bd: bd)));
    await tester.pumpAndSettle();

    expect(find.text('Sin servicio'), findsNWidgets(2)); // titulo e insignia
  });

  testWidgets('con el modulo de agua apagado no se dibuja la tarjeta',
      (tester) async {
    final bd = await conMunicipio(modulos: {'agua': false}, agua: {
      'horario': '06:00 - 12:00',
      'estado': 'activo',
    });
    await tester.pumpWidget(envolver(Repositorio(bd: bd)));
    await tester.pumpAndSettle();

    expect(find.text('06:00 - 12:00'), findsNothing);
    expect(find.text('Teocaltiche'), findsOneWidget);
  });
}
