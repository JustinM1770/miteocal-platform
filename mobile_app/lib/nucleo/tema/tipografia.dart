import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colores.dart';

/// Escala tipográfica (propuesta bento del Figma). Familia Geist; las
/// etiquetas pequeñas en mayúsculas van en Geist Mono.
///
/// TODO antes de publicar: empaquetar los .ttf de Geist en assets/ en vez de
/// que google_fonts los descargue en tiempo de ejecucion. En Teocaltiche hay
/// gente con datos moviles lentos y la app no debe depender de una descarga
/// para verse bien la primera vez.
class Tipografia {
  const Tipografia._();

  static TextStyle _geist(
    double tam,
    double alto,
    FontWeight peso,
    double tracking, [
    Color color = Colores.textoPrimario,
  ]) => GoogleFonts.geist(
    fontSize: tam,
    height: alto / tam,
    fontWeight: peso,
    letterSpacing: tracking,
    color: color,
  );

  /// Display — 34/36, 600, -1.2
  static TextStyle get display => _geist(34, 36, FontWeight.w600, -1.2);

  /// Title — 30/33, 600, -1.0
  static TextStyle get tituloPantalla => _geist(30, 33, FontWeight.w600, -1.0);

  /// Heading — 20/25, 600, -0.4
  static TextStyle get titulo => _geist(20, 25, FontWeight.w600, -0.4);

  /// Body Strong — 15/21, 500, -0.2
  static TextStyle get cuerpo => _geist(15, 21, FontWeight.w500, -0.2);

  /// Body — 15/21, 400, -0.2
  static TextStyle get cuerpoNormal => _geist(15, 21, FontWeight.w400, -0.2);

  /// Caption — 13/18, 400
  static TextStyle get leyenda =>
      _geist(13, 18, FontWeight.w400, 0, Colores.textoSecundario);

  /// Caption Strong — 13/18, 600
  static TextStyle get subtitulo => _geist(13, 18, FontWeight.w600, -0.1);

  /// Section Label — Geist Mono 11/14, 500, +0.6 (siempre en MAYÚSCULAS)
  static TextStyle get etiqueta => GoogleFonts.geistMono(
    fontSize: 11,
    height: 14 / 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.6,
    color: Colores.textoSecundario,
  );

  /// Micro — 11/14, 500, +0.1
  static TextStyle get micro =>
      _geist(11, 14, FontWeight.w500, 0.1, Colores.textoSecundario);

  /// Etiqueta de la barra de pestanas — 10.5, 500, +0.1
  static TextStyle get pestana => GoogleFonts.geist(
    fontSize: 10.5,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    color: Colores.textoSecundario,
  );
}
