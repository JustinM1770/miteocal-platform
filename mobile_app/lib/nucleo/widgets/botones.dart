import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../tema/tema.dart';

/// Boton azul de ancho completo ("Crear mi cuenta", "Enviar reporte").
class BotonPrimario extends StatelessWidget {
  const BotonPrimario({
    super.key,
    required this.texto,
    required this.alPresionar,
    this.icono,
    this.cargando = false,
    this.relleno = 15,
  });

  final String texto;
  final VoidCallback? alPresionar;
  final IconData? icono;
  final bool cargando;
  final double relleno;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    final activo = alPresionar != null && !cargando;
    return SizedBox(
      width: double.infinity,
      child: Material(
        color: activo ? color : color.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(Medidas.radioBoton),
        child: InkWell(
          borderRadius: BorderRadius.circular(Medidas.radioBoton),
          onTap: activo ? alPresionar : null,
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: relleno),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (cargando)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colores.textoInverso,
                    ),
                  )
                else if (icono != null)
                  Icon(icono, size: 17, color: Colores.textoInverso),
                if (cargando || icono != null)
                  const SizedBox(width: Medidas.e8),
                Flexible(
                  child: Text(
                    texto,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Tipografia.cuerpo.copyWith(
                      color: Colores.textoInverso,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Boton sin fondo ("Ya tengo cuenta", "No es correcto, cambiar colonia").
class BotonTexto extends StatelessWidget {
  const BotonTexto({super.key, required this.texto, required this.alPresionar});

  final String texto;
  final VoidCallback? alPresionar;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: InkWell(
        borderRadius: BorderRadius.circular(Medidas.radioBoton),
        onTap: alPresionar,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 15),
          child: Text(
            texto,
            textAlign: TextAlign.center,
            style: Tipografia.cuerpo.copyWith(
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ),
      ),
    );
  }
}

/// Circulo gris con flecha para regresar (pantallas de registro).
class BotonVolver extends StatelessWidget {
  const BotonVolver({super.key, this.alPresionar});

  final VoidCallback? alPresionar;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colores.fondoSutil,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: alPresionar ?? () => Navigator.of(context).maybePop(),
        child: const SizedBox(
          width: 38,
          height: 38,
          child: Icon(
            LucideIcons.chevronLeft,
            size: 19,
            color: Colores.textoPrimario,
          ),
        ),
      ),
    );
  }
}
