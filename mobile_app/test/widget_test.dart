import 'package:flutter_test/flutter_test.dart';
import 'package:miteocal/main.dart';

void main() {
  testWidgets('la app arranca con las cuatro pestanas', (tester) async {
    await tester.pumpWidget(const AppMiTeocal());

    expect(find.text('Inicio'), findsWidgets);
    expect(find.text('Noticias'), findsOneWidget);
    expect(find.text('Comercio'), findsOneWidget);
    expect(find.text('Servicios'), findsOneWidget);
  });

  testWidgets('cambiar de pestana muestra la pantalla correspondiente',
      (tester) async {
    await tester.pumpWidget(const AppMiTeocal());

    await tester.tap(find.text('Comercio'));
    await tester.pumpAndSettle();

    // El titulo de la pantalla y la etiqueta de la pestana: dos coincidencias.
    expect(find.text('Comercio'), findsNWidgets(2));
  });
}
