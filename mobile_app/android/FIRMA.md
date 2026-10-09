# Llave de firma de Android

> **Esta llave no se puede reemplazar.** Google Play identifica la app por la
> firma. Si la pierden, no pueden volver a publicar una actualizacion de
> `mx.miteocal.app` — nunca, y Google no la puede recuperar. Tendrian que
> publicar una app nueva y pedirle a todo Teocaltiche que la reinstale.
>
> Respaldenla el mismo dia que la generen.

## 1. Generar la llave

Fuera del repositorio. La ruta de abajo es una sugerencia:

```bash
mkdir -p ~/llaves
keytool -genkey -v \
  -keystore ~/llaves/miteocal-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

Te pide una contrasena y algunos datos (nombre, organizacion, ciudad). Usa una
contrasena larga y guardala en el gestor del equipo antes de continuar.

## 2. Conectarla al proyecto

```bash
cp android/key.properties.example android/key.properties
```

Edita `android/key.properties` con la contrasena que acabas de poner y la ruta
absoluta al `.jks`.

## 3. Compilar el AAB que se sube a Play

```bash
flutter build appbundle --release
```

Queda en `build/app/outputs/bundle/release/app-release.aab`. Ese es el archivo
que se sube a la prueba cerrada de Play Console.

Para comprobar que quedo firmado con la llave correcta y no con la de
depuracion:

```bash
keytool -printcert -jarfile build/app/outputs/bundle/release/app-release.aab
```

## 4. Respaldar

Tres copias, en lugares distintos:

- El `.jks` en el gestor de contrasenas del equipo (Bitwarden acepta adjuntos)
- Una copia en el Drive del proyecto, en una carpeta restringida
- La contrasena y el alias anotados junto a cada copia — una llave sin su
  contrasena sirve igual que ninguna

**Nunca** en el repositorio, ni en WhatsApp, ni en el correo.

## Si algo sale mal

Mientras no exista `android/key.properties`, la compilacion de release usa la
llave de depuracion para no romperle el build a nadie. Sirve para probar en
local, pero **Google Play rechaza un AAB firmado asi**. Si Play te dice que el
paquete no esta firmado correctamente, es que falta este archivo.
