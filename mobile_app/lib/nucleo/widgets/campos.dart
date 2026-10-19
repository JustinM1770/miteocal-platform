import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../tema/tema.dart';

/// Etiqueta en mayusculas + campo, como en "10 · Registro".
class CampoFormulario extends StatelessWidget {
  const CampoFormulario({
    super.key,
    required this.etiqueta,
    required this.child,
  });

  final String etiqueta;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(etiqueta.toUpperCase(), style: Tipografia.etiqueta),
        const SizedBox(height: 7),
        child,
      ],
    );
  }
}

/// Entrada de texto: gris en reposo, borde azul de 1.6 px al enfocar.
class Entrada extends StatelessWidget {
  const Entrada({
    super.key,
    required this.controlador,
    this.pista,
    this.icono,
    this.prefijo,
    this.teclado,
    this.formatos,
    this.accion,
    this.capitalizacion = TextCapitalization.none,
    this.lineas = 1,
    this.alCambiar,
    this.autocompletar,
  });

  final TextEditingController controlador;
  final String? pista;
  final IconData? icono;

  /// Texto fijo a la izquierda con un filete ("+52 |").
  final String? prefijo;
  final TextInputType? teclado;
  final List<TextInputFormatter>? formatos;
  final TextInputAction? accion;
  final TextCapitalization capitalizacion;
  final int lineas;
  final ValueChanged<String>? alCambiar;
  final Iterable<String>? autocompletar;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    OutlineInputBorder borde(Color color, double ancho) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(Medidas.radioBoton),
      borderSide: BorderSide(color: color, width: ancho),
    );

    return TextField(
      controller: controlador,
      keyboardType: teclado,
      inputFormatters: formatos,
      textInputAction: accion,
      textCapitalization: capitalizacion,
      minLines: lineas,
      maxLines: lineas,
      onChanged: alCambiar,
      autofillHints: autocompletar,
      style: Tipografia.cuerpoNormal,
      cursorColor: primary,
      decoration: InputDecoration(
        isDense: true,
        hintText: pista,
        hintStyle: Tipografia.cuerpoNormal.copyWith(
          color: Colores.textoSecundario,
        ),
        filled: true,
        fillColor: Colores.fondoSutil,
        contentPadding: const EdgeInsets.all(14),
        prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
        prefixIcon: icono != null
            ? Padding(
                padding: const EdgeInsets.only(left: 14, right: 9),
                child: Icon(icono, size: 18, color: Colores.textoSecundario),
              )
            : prefijo != null
            ? Padding(
                padding: const EdgeInsets.only(left: 14, right: 9),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      prefijo!,
                      style: Tipografia.cuerpo.copyWith(
                        color: Colores.textoSecundario,
                      ),
                    ),
                    const SizedBox(width: 9),
                    Container(width: 1, height: 18, color: Colores.borde),
                  ],
                ),
              )
            : null,
        enabledBorder: borde(Colors.transparent, 0),
        focusedBorder: borde(primary, 1.6),
        border: borde(Colors.transparent, 0),
      ),
    );
  }
}

/// Las tres rayitas de avance del registro.
class Progreso extends StatelessWidget {
  const Progreso({super.key, required this.paso, this.total = 3});

  final int paso;
  final int total;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < total; i++) ...[
          if (i > 0) const SizedBox(width: 5),
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 22,
            height: 4,
            decoration: BoxDecoration(
              color: i < paso ? primary : Colores.borde,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ],
    );
  }
}

/// Icono dentro de un cuadro redondeado (beneficios, servicios, emergencias).
class CuadroIcono extends StatelessWidget {
  const CuadroIcono({
    super.key,
    required this.icono,
    this.fondo = Colores.soft,
    this.color,
    this.tam = 40,
    this.tamIcono = 21,
    this.radio = 13,
  });

  final IconData icono;
  final Color fondo;
  final Color? color;
  final double tam;
  final double tamIcono;
  final double radio;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: tam,
      height: tam,
      decoration: BoxDecoration(
        color: fondo,
        borderRadius: BorderRadius.circular(radio),
      ),
      child: Icon(
        icono,
        size: tamIcono,
        color: color ?? Theme.of(context).colorScheme.primary,
      ),
    );
  }
}
