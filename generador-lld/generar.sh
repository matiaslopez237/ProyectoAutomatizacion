#!/bin/bash
# Corre un script BeanShell del generador con las clases de LOGO!Soft Comfort V7 instalado.
# Uso (Git Bash):  ./generar.sh guia-tp.bsh
#                  ./generar.sh inspeccionar.bsh "../Ejercicios/EJ autoatizacion.lld"
# Si LOGO!Soft está en otra carpeta: LOGO_DIR="D:/Siemens/LOGOComfort_V7" ./generar.sh ...
set -e
LOGO_DIR="${LOGO_DIR:-/c/Program Files/Siemens/LOGOComfort_V7}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
SCRIPT="$1"; shift

CP="$(cygpath -w "$LOGO_DIR")"
for j in "$LOGO_DIR"/lib/*.jar "$LOGO_DIR"/lib/*.zip; do CP="$CP;$(cygpath -w "$j")"; done

cd "$LOGO_DIR"
# headless: si algo intenta abrir un diálogo, falla con un error en vez de quedar colgado
"$LOGO_DIR/jre/bin/java" -Dfile.encoding=UTF-8 -Djava.library.path=bin -Djava.awt.headless=true \
  -Dlogo.dir="$(cygpath -m "$LOGO_DIR")" -Dgen.dir="$(cygpath -m "$HERE")" -Drepo.dir="$(cygpath -m "$REPO")" \
  -cp "$CP" bsh.Interpreter "$(cygpath -w "$HERE/$SCRIPT")" "$@" 2>&1 | grep -vE "hirestimer|tzmappings"
