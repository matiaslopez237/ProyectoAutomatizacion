# Generador de programas `.lld`

Los `.lld` de LOGO!Soft Comfort son objetos Java serializados. Estos scripts BeanShell usan las clases del propio LOGO!Soft para cargar un programa base, vaciarlo y armar circuitos KOP nuevos: contactos, bobinas, temporizadores, contadores, relé autoenclavador y disparadores analógicos. El archivo resultante abre normalmente en LOGO!Soft.

## Requisitos

- LOGO!Soft Comfort **V7** instalado (por defecto en `C:\Program Files\Siemens\LOGOComfort_V7`). Se usan su JRE y sus librerías; no hace falta otro Java.
- Git Bash (Windows).

## Uso

```bash
cd generador-lld
./generar.sh invernadero.bsh        # regenera Ejercicios/Proyecto/Invernadero.lld
./generar.sh guia-tp.bsh            # regenera Ejercicios/Guia TP/*.lld
./generar.sh ejercicios-nuevos.bsh  # regenera Ejercicios/Nuevos/*.lld
./generar.sh inspeccionar.bsh "../Ejercicios/EJ autoatizacion.lld"   # lista bloques y la lógica compilada
```

Si LOGO!Soft está en otra carpeta:

```bash
LOGO_DIR="D:/Siemens/LOGOComfort_V7" ./generar.sh guia-tp.bsh
```

## Archivos

- `lib.bsh`: funciones base. `loadDrawing` y `saveDrawing` leen y escriben el formato (al guardar ajusta la cantidad de hojas para que LOGO!Soft muestre todo el programa); además `contact`, `coil`, `onDelay`, `timer` (temporizador en s, min u h), `weekly` (temporizador semanal), `sfb` (función especial), `wire`/`wireIn` (conexiones), `comment` y `dumpModel` (muestra la lógica que compila LOGO!Soft, útil para verificar).
- `invernadero.bsh`: el programa del proyecto, igual al ejemplo del simulador web.
- `guia-tp.bsh` y `ejercicios-nuevos.bsh`: un bloque de código por ejercicio.
- Como plantilla se usa `Ejercicios/EJ autoatizacion.lld`; de ahí salen la configuración y el autor del programa.
