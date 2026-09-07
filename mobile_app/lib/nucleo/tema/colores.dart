import 'package:flutter/material.dart';

/// Tokens de color tomados de docs/sistema-de-diseno.md.
///
/// OJO: estos son los valores por DEFECTO. Los cuatro colores de marca
/// (primary, primarySoft, success, danger) los manda el documento del
/// municipio en su campo `tema` — ver la regla 3 de
/// docs/arquitectura-multimunicipio.md: "los colores son dato, no codigo".
/// Usalos como respaldo mientras carga la configuracion, nunca como la
/// unica fuente.
class Colores {
  const Colores._();

  // Marca
  static const primary = Color(0xFF1552E0);
  static const soft = Color(0xFFEDF2FE);

  // Texto
  static const textoPrimario = Color(0xFF0E1116);
  static const textoSecundario = Color(0xFF6B7280);
  static const textoInverso = Color(0xFFFFFFFF);

  // Fondos
  static const fondoTarjeta = Color(0xFFFFFFFF);
  static const fondoPantalla = Color(0xFFF5F6F8);
  static const fondoInverso = Color(0xFF0E1116);

  // Bordes
  static const borde = Color(0xFFE8EAEE);

  // Estado
  static const exito = Color(0xFF12A150);
  static const exitoSuave = Color(0xFFE6F6EE);
  static const peligro = Color(0xFFD93A3A);

  // Acento
  static const whatsapp = Color(0xFF25D366);
}
