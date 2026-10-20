import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colores.dart';

/// Escala tipografica de docs/sistema-de-diseno.md.
/// Familia principal Inter; DM Sans para etiquetas de acento.
///
/// TODO antes de publicar: empaquetar los .ttf de Inter y DM Sans en assets/
/// en vez de que google_fonts los descargue en tiempo de ejecucion. En
/// Teocaltiche hay gente con datos moviles lentos y la app no debe depender
/// de una descarga para verse bien la primera vez.
class Tipografia {
  const Tipografia._();

  /// Heading — 17/22, peso 600, tracking -0.20
  static TextStyle get titulo => GoogleFonts.inter(
        fontSize: 17,
        height: 22 / 17,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.20,
        color: Colores.textoPrimario,
      );

  /// Body Strong — 15/22, peso 500, tracking -0.10
  static TextStyle get cuerpo => GoogleFonts.inter(
        fontSize: 15,
        height: 22 / 15,
        fontWeight: FontWeight.w500,
        letterSpacing: -0.10,
        color: Colores.textoPrimario,
      );

  /// Caption Strong — 13/18, peso 600, sin tracking
  static TextStyle get subtitulo => GoogleFonts.inter(
        fontSize: 13,
        height: 18 / 13,
        fontWeight: FontWeight.w600,
        letterSpacing: 0,
        color: Colores.textoSecundario,
      );

  /// Micro — 11/14, peso 500, tracking +0.20
  static TextStyle get micro => GoogleFonts.inter(
        fontSize: 11,
        height: 14 / 11,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.20,
        color: Colores.textoSecundario,
      );
}
