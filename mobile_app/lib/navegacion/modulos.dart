import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../datos/modelos/colonia.dart';
import '../datos/modelos/municipio.dart';
import '../datos/modelos/perfil.dart';
import '../pantallas/modulos/agua_pagina.dart';
import '../pantallas/modulos/basura_pagina.dart';
import '../pantallas/modulos/cierres_pagina.dart';
import '../pantallas/modulos/escuelas_pagina.dart';
import '../pantallas/modulos/feria_pagina.dart';
import '../pantallas/modulos/paisanos_pagina.dart';

/// Modulos que el municipio puede contratar. La clave es la del mapa
/// `modulos` del documento del municipio: un modulo apagado no se muestra.
enum Modulo {
  agua('agua', 'Agua', LucideIcons.droplet),
  basura('basura', 'Basura en vivo', LucideIcons.truck),
  cierres('cierres', 'Cierres y obras', LucideIcons.construction),
  escuelas('escuelas', 'Escuelas', LucideIcons.graduationCap),
  feria('feria', 'Feria', LucideIcons.ticket),
  paisanos('paisanos', 'Paisanos', LucideIcons.globe);

  const Modulo(this.clave, this.nombre, this.icono);
  final String clave;
  final String nombre;
  final IconData icono;
}

/// Abre la pantalla del modulo con el contexto del vecino.
void abrirModulo(
  BuildContext context,
  Modulo modulo, {
  Municipio? municipio,
  Colonia? colonia,
  Perfil? perfil,
  VoidCallback? alReportarBasura,
}) {
  final nombre = municipio?.nombre ?? '';
  final direccion = perfil?.direccion ?? '';
  final Widget pagina = switch (modulo) {
    Modulo.agua => AguaPagina(colonia: colonia),
    Modulo.basura => BasuraPagina(
      colonia: colonia,
      direccion: direccion,
      alReportar: alReportarBasura,
    ),
    Modulo.cierres => CierresPagina(direccion: direccion),
    Modulo.escuelas => EscuelasPagina(municipio: nombre),
    Modulo.feria => FeriaPagina(municipio: nombre),
    Modulo.paisanos => PaisanosPagina(municipio: nombre),
  };
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => pagina));
}
