import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miteocal/datos/repositorio.dart';
import 'package:miteocal/datos/repositorio_firestore.dart';
import 'package:miteocal/datos/sesion.dart';
import 'package:miteocal/navegacion/concha_principal.dart';
import 'package:miteocal/navegacion/pestanas.dart';
import 'package:provider/provider.dart';

Widget concha() => MultiProvider(
  providers: [
    Provider<Repositorio>.value(
      value: RepositorioFirestore(bd: FakeFirebaseFirestore()),
    ),
    ChangeNotifierProvider(create: (_) => Sesion()),
    ChangeNotifierProvider(create: (_) => Pestanas()),
  ],
  child: const MaterialApp(home: ConchaPrincipal()),
);

void main() {
  testWidgets('la concha muestra las cuatro pestanas', (tester) async {
    await tester.pumpWidget(concha());
    await tester.pumpAndSettle();

    expect(find.text('Inicio'), findsOneWidget);
    expect(find.text('Noticias'), findsOneWidget);
    expect(find.text('Comercio'), findsOneWidget);
    expect(find.text('Servicios'), findsOneWidget);
  });

  testWidgets('cambiar de pestana muestra la pantalla correspondiente', (
    tester,
  ) async {
    await tester.pumpWidget(concha());
    await tester.pumpAndSettle();

    await tester.tap(find.text('Comercio'));
    await tester.pumpAndSettle();

    expect(find.text('Comercio'), findsNWidgets(2)); // pestana y titulo
  });
}
