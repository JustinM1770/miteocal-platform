import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';
import 'package:miteocal/datos/modelos/perfil.dart';
import 'package:miteocal/datos/repositorio.dart';
import 'package:miteocal/datos/repositorio_demo.dart';
import 'package:miteocal/datos/sesion.dart';
import 'package:miteocal/navegacion/concha_principal.dart';
import 'package:miteocal/navegacion/pestanas.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> montar(WidgetTester tester) async {
  SharedPreferences.setMockInitialValues({});
  final sesion = Sesion();
  await sesion.guardar(const Perfil(uid: 'u1', nombre: 'Ana', telefono: '3461234567', coloniaId: 'teocaltiche-centro'));
  await tester.pumpWidget(MultiProvider(
    providers: [
      Provider<Repositorio>.value(value: RepositorioDemo(latencia: Duration.zero)),
      ChangeNotifierProvider.value(value: sesion),
      ChangeNotifierProvider(create: (_) => Pestanas()),
    ],
    child: const MaterialApp(home: ConchaPrincipal()),
  ));
  await tester.pump(const Duration(milliseconds: 500));
}

/// Deja terminar las animaciones y temporizadores antes de cerrar la prueba
Future<void> desmontar(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox());
  await tester.pump(const Duration(seconds: 5));
}

void main() {
  testWidgets('en iPhone la barra de pestañas es de cristal', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    try {
      await montar(tester);
      expect(find.byType(GlassTabBar), findsOneWidget);
      await desmontar(tester);
    } finally {
      debugDefaultTargetPlatformOverride = null;
    }
  });

  testWidgets('en Android se queda la barra de siempre', (tester) async {
    await montar(tester);
    expect(find.byType(GlassTabBar), findsNothing);
    expect(find.text('Servicios'), findsWidgets);
    await desmontar(tester);
  });
}
