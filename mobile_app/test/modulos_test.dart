import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miteocal/datos/modelos/perfil.dart';
import 'package:miteocal/datos/repositorio.dart';
import 'package:miteocal/datos/repositorio_demo.dart';
import 'package:miteocal/datos/sesion.dart';
import 'package:miteocal/navegacion/concha_principal.dart';
import 'package:miteocal/navegacion/modulos.dart';
import 'package:miteocal/navegacion/pestanas.dart';
import 'package:miteocal/pantallas/modulos/feria_pagina.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

const ana = Perfil(
  uid: 'u1',
  nombre: 'Ana López',
  telefono: '3461234567',
  direccion: 'Zaragoza 45',
  coloniaId: 'teocaltiche-centro',
);

Future<(RepositorioDemo, Sesion)> montar(
  WidgetTester tester,
  Widget home, {
  int pestana = Pestanas.inicio,
}) async {
  SharedPreferences.setMockInitialValues({});
  final repo = RepositorioDemo(latencia: Duration.zero);
  final sesion = Sesion();
  await sesion.guardar(ana);
  await tester.binding.setSurfaceSize(const Size(390, 2400));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<Repositorio>.value(value: repo),
        ChangeNotifierProvider.value(value: sesion),
        ChangeNotifierProvider(create: (_) => Pestanas()..ir(pestana)),
      ],
      child: MaterialApp(home: home),
    ),
  );
  await tester.pumpAndSettle();
  return (repo, sesion);
}

void main() {
  testWidgets('Noticias filtra por categoria', (tester) async {
    await montar(tester, const ConchaPrincipal(), pestana: Pestanas.noticias);
    expect(find.textContaining('vacunación'), findsOneWidget);
    await tester.tap(find.text('Obras').first);
    await tester.pumpAndSettle();
    expect(find.textContaining('vacunación'), findsNothing);
    expect(find.textContaining('calle Zaragoza'), findsOneWidget);
  });

  testWidgets('Comercio busca negocios', (tester) async {
    await montar(tester, const ConchaPrincipal(), pestana: Pestanas.comercio);
    expect(find.text('Farmacia del Centro'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'tacos');
    await tester.pumpAndSettle();
    expect(find.text('Farmacia del Centro'), findsNothing);
    expect(find.text('Tacos El Portal'), findsOneWidget);
  });

  testWidgets('Inicio muestra los modulos contratados y abre Escuelas', (
    tester,
  ) async {
    await montar(tester, const ConchaPrincipal());
    for (final m in Modulo.values.where((m) => m != Modulo.agua)) {
      expect(find.text(m.nombre), findsOneWidget, reason: m.nombre);
    }
    await tester.tap(find.text('Escuelas'));
    await tester.pumpAndSettle();
    expect(find.text('TUS ESCUELAS'), findsOneWidget);
    expect(find.text('Preparatoria Regional'), findsWidgets);
  });

  testWidgets('la cartelera trae el programa real y separa plaza y toros', (
    tester,
  ) async {
    await montar(tester, const FeriaPagina(municipio: 'Teocaltiche'));
    expect(
      find.text('Inauguración · Certamen Srita. Teocaltiche'),
      findsOneWidget,
    );
    expect(find.text('Con Mario Bautista'), findsOneWidget);
    expect(find.text('La Adictiva'), findsNothing); // es de la Plaza de Toros

    await tester.tap(find.text('Plaza de Toros').first);
    await tester.pumpAndSettle();
    expect(find.text('La Adictiva'), findsOneWidget);
    expect(find.text('Precio por confirmar'), findsWidgets);
  });

  testWidgets(
    'apartar un boleto simulado genera el pase con QR valido para el panel',
    (tester) async {
      final (repo, _) = await montar(
        tester,
        const FeriaPagina(municipio: 'Teocaltiche'),
      );
      expect(find.byType(QrImageView), findsNothing);

      await tester.tap(find.text('Plaza de Toros').first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('La Arrolladora Banda El Limón'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Apartar boleto'));
      await tester.pumpAndSettle();

      expect(repo.pases, hasLength(1));
      expect(repo.pases.single.carga, startsWith('MITEOCAL1|teocaltiche|TEC-'));
      expect(find.byType(QrImageView), findsOneWidget);
      expect(
        find.textContaining('Folio ${repo.pases.single.folio}'),
        findsOneWidget,
      );
    },
  );

  testWidgets('un evento gratuito no pide boleto', (tester) async {
    final (repo, _) = await montar(tester, const FeriaPagina());
    await tester.tap(find.text('Joss Favela'));
    await tester.pumpAndSettle();
    expect(find.text('Gratis'), findsOneWidget);
    expect(find.text('Agregar a mi agenda'), findsOneWidget);
    expect(find.text('Apartar boleto'), findsNothing);
    expect(repo.pases, isEmpty);

    await tester.tap(find.text('Agregar a mi agenda'));
    await tester.pumpAndSettle();
    expect(find.text('En mi agenda'), findsOneWidget);
  });

  testWidgets('el certamen muestra el evento de esa misma noche', (tester) async {
    await montar(tester, const FeriaPagina());
    await tester.tap(find.text('Inauguración · Certamen Srita. Teocaltiche'));
    await tester.pumpAndSettle();
    expect(find.text('Con Mario Bautista'), findsOneWidget);
    expect(find.text('CERTAMEN · PLAZA PRINCIPAL'), findsOneWidget);
  });

  testWidgets('votar por una candidata registra un solo voto por certamen', (
    tester,
  ) async {
    final (repo, _) = await montar(tester, const FeriaPagina());
    await tester.scrollUntilVisible(find.text('Alondra Ruvalcaba'), 300);
    await tester.tap(find.text('Alondra Ruvalcaba'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Votar'));
    await tester.pumpAndSettle();
    expect(repo.votos['reina'], 'r3');
    expect(find.text('Tu voto'), findsOneWidget);

    await tester.tap(find.text('Nicole Ramírez'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Votar'));
    await tester.pumpAndSettle();
    expect(repo.votos['reina'], 'r1');
    expect(find.text('Tu voto'), findsOneWidget);
  });
}
