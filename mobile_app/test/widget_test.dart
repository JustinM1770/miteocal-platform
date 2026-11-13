import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:miteocal/datos/repositorio.dart';
import 'package:miteocal/datos/repositorio_firestore.dart';
import 'package:miteocal/datos/sesion.dart';
import 'package:miteocal/navegacion/concha_principal.dart';
import 'package:miteocal/navegacion/pestanas.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('la píldora muestra Inicio activo y Servicios como ícono', (tester) async {
    await tester.pumpWidget(concha());
    await tester.pumpAndSettle();

    expect(find.text('Inicio'), findsOneWidget);
    expect(find.byIcon(LucideIcons.layoutGrid), findsOneWidget);
    // Entrega del hackathon: sin Noticias ni Comercio en la barra
    expect(find.byIcon(LucideIcons.newspaper), findsNothing);
    expect(find.byIcon(LucideIcons.shoppingBag), findsNothing);
  });

  testWidgets('tocar Servicios cambia de pantalla', (tester) async {
    await tester.pumpWidget(concha());
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(LucideIcons.layoutGrid));
    await tester.pumpAndSettle();

    expect(find.text('Servicios'), findsWidgets);
    expect(find.text('Reporte de fallas'), findsOneWidget);
  });
}
