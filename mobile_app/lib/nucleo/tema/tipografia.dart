import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colores.dart';

/// Escala tipografica del Figma. Familia Inter.
///
/// TODO antes de publicar: empaquetar los .ttf de Inter en assets/ en vez de
/// que google_fonts los descargue en tiempo de ejecucion. En Teocaltiche hay
/// gente con datos moviles lentos y la app no debe depender de una descarga
/// para verse bien la primera vez.
class Tipografia {
  const Tipografia._();

  static TextStyle _inter(
    double tam,
    double alto,
    FontWeight peso,
    double tracking, [
    Color color = Colores.textoPrimario,
  ]) => GoogleFonts.inter(
    fontSize: tam,
    height: alto / tam,
    fontWeight: peso,
    letterSpacing: tracking,
    color: color,
  );

  /// Display — 28/34, 700, -0.6
  static TextStyle get display => _inter(28, 34, FontWeight.w700, -0.6);

  /// Title — 22/28, 700, -0.4
  static TextStyle get tituloPantalla => _inter(22, 28, FontWeight.w700, -0.4);

  /// Heading — 17/22, 600, -0.2
  static TextStyle get titulo => _inter(17, 22, FontWeight.w600, -0.2);

  /// Body Strong — 15/22, 500, -0.1
  static TextStyle get cuerpo => _inter(15, 22, FontWeight.w500, -0.1);

  /// Body — 15/22, 400, -0.1
  static TextStyle get cuerpoNormal => _inter(15, 22, FontWeight.w400, -0.1);

  /// Caption — 13/18, 400
  static TextStyle get leyenda =>
      _inter(13, 18, FontWeight.w400, 0, Colores.textoSecundario);

  /// Caption Strong — 13/18, 600
  static TextStyle get subtitulo => _inter(13, 18, FontWeight.w600, 0);

  /// Section Label — 12/16, 600, +0.6 (siempre en MAYUSCULAS)
  static TextStyle get etiqueta =>
      _inter(12, 16, FontWeight.w600, 0.6, Colores.textoSecundario);

  /// Micro — 11/14, 500, +0.2
  static TextStyle get micro =>
      _inter(11, 14, FontWeight.w500, 0.2, Colores.textoSecundario);

  /// Etiqueta de la barra de pestanas — 10.5, 500, +0.1
  static TextStyle get pestana => GoogleFonts.inter(
    fontSize: 10.5,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    color: Colores.textoSecundario,
  );
}
