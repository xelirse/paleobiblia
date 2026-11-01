# Paleobiblia

Visualizador interactivo del primer capítulo del Génesis escrito con el alfabeto paleohebreo. La aplicación dibuja cada letra en `<canvas>`, permite personalizar la correspondencia entre las 22 letras hebreas y el alfabeto latino, y ofrece tablas de frecuencias y filtros mediante expresiones regulares.

> **Estado del proyecto**: dominio público. Puedes usarlo, modificarlo y redistribuirlo sin restricciones.

---

## 📖 Descripción

**Paleobiblia** nace con un objetivo divulgativo: mostrar el texto de **Génesis 1** en su forma paleohebrea de una manera visual, interactiva y accesible desde cualquier navegador moderno, sin dependencias externas ni backend.

El alfabeto utilizado está **inspirado en la tabla de referencia** publicada en [hebrewoldtestament.com](http://www.hebrewoldtestament.com/hebrewalpha.htm), que recoge las formas moderna y paleohebrea, el nombre, la pronunciación y la transliteración de cada una de las 22 letras.

---

## ✨ Características

- **Dibujo vectorial de las 22 letras paleohebreas** directamente sobre `<canvas>`, sin imágenes ni fuentes externas.
- **Alfabeto personalizable**: asigna libremente cualquier carácter latino a cada una de las 22 posiciones hebreas.
- **Cuatro modos de lectura** para cada versículo:
  - Números (1–22).
  - Letras del alfabeto activo.
  - Letras A–V (notación tradicional).
  - Letras hebreas modernas (א–ת).
- **Lectura hebrea (RTL)** conmutable, que invierte líneas, palabras y caracteres.
- **Tabla de frecuencias de caracteres** y **tabla de frecuencias de palabras**.
- **Filtro por expresiones regulares** con panel de pestañas según el anclaje del patrón (`—`, `^—`, `—$`, `^—$`) y ordenación RTL para la pestaña `—$`.
- **Constructor de abecedario** con arrastrar y soltar, badges de conteo y código de colores (letras únicas vs. repetidas).
- **Generador aleatorio de abecedarios** (🎲) con búsqueda en dos fases.
- **Persistencia en `localStorage`**: alfabetos guardados, expresiones regulares y preferencias de visualización.
- **100 % estático**: HTML + CSS + JavaScript vanilla. No requiere instalación ni servidor.

---

## 🧠 Hecho con IA

Este proyecto fue desarrollado con asistencia intensiva de modelos de lenguaje:

- **Google Gemini** — arquitectura inicial, revisión de código y refactorización modular.
- **DeepSeek** — generación de código, detección de bugs, división en módulos y documentación técnica.

El código final ha sido revisado y probado manualmente, pero conserva la huella del proceso de desarrollo asistido por IA.

---

## 🗂️ Estructura del proyecto

```
.
├── paleohebreo.html          # Documento principal
├── styles.css                # Hoja de estilos única
└── js/
    ├── state.js              # Estado global + constantes + RAW_VERSES
    ├── draw.js               # 22 funciones de dibujo + alphabetData + LETTERS
    ├── utils.js              # Codificación base22, frecuencias, escape HTML
    ├── ui.js                 # Toast + Modal
    ├── regex.js              # Expresiones regulares: CRUD, pestañas, RTL, render
    ├── frequency-tables.js   # Tablas de frecuencias de caracteres y palabras
    ├── alphabet.js           # Persistencia, selector, constructor, copia
    ├── random-alphabet.js    # Generación aleatoria de abecedarios
    ├── verses.js             # Canvas de versículos + grid del alfabeto
    ├── events.js             # Checkboxes, refresco global, setupEvents()
    └── main.js               # programa(): punto de entrada
```

Los scripts se cargan con `defer` en el orden indicado; `main.js` es siempre el último porque ejecuta `programa()`.

---

## 🚀 Cómo usar

1. Descarga o clona el repositorio.
2. Abre `paleohebreo.html` en tu navegador.
3. No necesitas instalar nada ni ejecutar un servidor local.

> Para un mejor comportamiento de `localStorage` en algunos navegadores, puedes servir la carpeta con cualquier servidor estático (por ejemplo, `python -m http.server`).

---

## ⚙️ Tecnologías

| Capa | Tecnología |
|---|---|
| Estructura | HTML5 |
| Estilos | CSS3 (Grid, Flexbox) |
| Lógica | JavaScript ES6+ (vanilla, sin frameworks) |
| Dibujo | Canvas 2D API |
| Persistencia | `localStorage` |

---

## 📚 Referencia del alfabeto

La correspondencia entre formas paleohebreas, nombres, pronunciación y transliteración está inspirada en:

- **[The Hebrew Alphabet and Transliteration Chart](http://www.hebrewoldtestament.com/hebrewalpha.htm)** — tabla de referencia con las formas moderna y paleohebrea de las 22 letras.

Las formas dibujadas en este proyecto son interpretaciones libres de dicha referencia, pensadas para su visualización en pantalla.

---

## 📄 Licencia

Este proyecto se distribuye bajo **dominio público** mediante la licencia [Unlicense](https://unlicense.org/).

Puedes copiar, modificar, publicar, usar, compilar, vender o distribuir el software, con o sin modificaciones, con cualquier propósito, comercial o no comercial, y por cualquier medio, sin necesidad de atribución.

El software se proporciona "tal cual", sin garantía de ningún tipo.

---

## 🙏 Créditos

- Referencia del alfabeto: [hebrewoldtestament.com](http://www.hebrewoldtestament.com/hebrewalpha.htm).
- Desarrollo asistido por IA: Google Gemini y DeepSeek.
- Inspiración textual: Génesis 1 en transliteración paleohebrea.

---

> *"En el principio creó Elohim los cielos y la tierra."* — Génesis 1:1
