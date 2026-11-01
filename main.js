/* ==================================================================
   PUNTO DE ENTRADA
   ==================================================================
   Este archivo contiene únicamente programa(), la función que se
   ejecuta una sola vez al cargar la página y orquesta el arranque:

     1. Cachea las referencias al DOM en S.dom.*.
     2. Inicializa el alfabeto activo.
     3. Construye S.VERSES a partir de S.RAW_VERSES (tokenizado +
        codificación base22).
     4. Calcula frecuencias de caracteres y de palabras.
     5. Calcula el ancho máximo de línea y el factor de escala.
     6. Construye el grid del alfabeto, los 32 versículos y registra
        los listeners.
     7. Carga alfabetos guardados, migra el formato legacy, carga
        regex y resuelve el alfabeto activo (preset / guardado /
        borrador) con fallback al primer preset.
     8. Carga los estados de los checkboxes.
     9. Renderiza el selector de abecedario, el constructor y, por
        último, updateVerses() — que refresca canvas, índices y todas
        las tablas con las preferencias reales.

   FIX respecto al programa() original:
     El original construía los versículos con valores por defecto
     (LTR, sin letras) y luego cargaba los checkboxes, pero nunca
     volvía a llamar a updateVerses(). Resultado: al recargar con
     “Usar letras” o “Lectura hebrea” guardados, las tablas de
     frecuencias sí respetaban el estado, pero los canvas y los
     bloques de índices de los versículos seguían mostrándose con
     LTR/números.

     Ahora, después de loadCheckboxStates() se llama a updateVerses(),
     que re-renderiza canvas + índices con direction/labels reales.
     Como updateVerses() ya refresca internamente:
       - renderFrequencyTable(showLetters),
       - refreshRegexUI() → renderRegexColumn, updateRegexTotal,
         renderWordFrequencyTable, renderFilteredWordFrequencyTable,
         updateAlphabetCounts,
     se eliminan las llamadas sueltas a esas funciones que había en
     el tail original. El arranque queda en tres pasos:
         loadCheckboxStates();
         renderAlphabetSelect();
         renderAlphabetBuilder();
         updateVerses();

   Dependencias (todas cargadas antes, con defer):
     state, draw, utils, ui, regex, frequency-tables, alphabet,
     random-alphabet, verses, events.
   ================================================================== */

function programa() {
    const S = getState();

    /* --------------------------------------------------------------
       1. CACHE DE REFERENCIAS AL DOM
       -------------------------------------------------------------- */
    S.dom.grid              = document.getElementById('alphabet-grid');
    S.dom.versesContainer   = document.getElementById('verses-container');
    S.dom.alphabetDetails   = document.getElementById('alphabet-details');
    S.dom.toggleAlphabetBtn = document.getElementById('toggle-alphabet');
    S.dom.toggleVersesBtn   = document.getElementById('toggle-verses');
    S.dom.toggleDirection   = document.getElementById('toggle-direction');
    S.dom.toggleLabels      = document.getElementById('toggle-labels');
    S.dom.alphabetSelect    = document.getElementById('alphabet-select');
    S.dom.toggleSortLength  = document.getElementById('toggle-sort-length');
    S.dom.alphabetBuilder   = document.getElementById('alphabet-builder');
    S.dom.addAlphabetBtn    = document.getElementById('btn-add-alphabet');
    S.dom.delAlphabetBtn    = document.getElementById('btn-del-alphabet');
    S.dom.regexInput        = document.getElementById('regex-input');
    S.dom.regexAddBtn       = document.getElementById('regex-add-btn');
    S.dom.sortAlphaBtn      = document.getElementById('btn-sort-regex-alpha');
    S.dom.sortFreqBtn       = document.getElementById('btn-sort-regex-freq');
    S.dom.randomAlphabetBtn = document.getElementById('btn-random-alphabet');
    S.dom.copyAlphabetBtn   = document.getElementById('btn-copy-alphabet');

    /* --------------------------------------------------------------
       2. ALFABETO INICIAL (por defecto A..V; se reemplaza más abajo
          con el preset / guardado / borrador persistido)
       -------------------------------------------------------------- */
    S.customAlphabetChars = 'ABCDEFGHIJKLMNOPQRSTUV'.split('');
    S.currentAlphabet     = S.customAlphabetChars.join('');

    /* --------------------------------------------------------------
       3. CONSTRUCCIÓN DE S.VERSES
          Cada versículo queda como:
            {
              n: 1..32,
              lines:       [[tok, tok, …], …],
              linesBase22: [[b22, b22, …], …]
            }
       -------------------------------------------------------------- */
    S.VERSES = [];
    for (let i = 0; i < S.RAW_VERSES.length; i++) {
        const str = S.RAW_VERSES[i];
        const lines = str.split('|');
        const linesArr = [];
        const linesBase22Arr = [];

        for (let j = 0; j < lines.length; j++) {
            const tokens = lines[j].split(' ');
            linesArr.push(tokens);

            const b22 = [];
            for (let k = 0; k < tokens.length; k++) {
                b22.push(encodeToBase22(tokens[k]));
            }
            linesBase22Arr.push(b22);
        }

        S.VERSES.push({
            n: i + 1,
            lines: linesArr,
            linesBase22: linesBase22Arr
        });
    }

    /* --------------------------------------------------------------
       4. FRECUENCIAS
       -------------------------------------------------------------- */
    S.FREQUENCIES      = computeFrequencies();
    S.WORD_FREQUENCIES = computeWordFrequencies();

    /* --------------------------------------------------------------
       5. ANCHO MÁXIMO Y ESCALA
          MAX_W: ancho en píxeles de la línea más larga (sin escalar).
          SCALE: factor para que ninguna línea exceda CONTENT_W.
       -------------------------------------------------------------- */
    let maxW = 0;
    for (let i = 0; i < S.VERSES.length; i++) {
        for (let j = 0; j < S.VERSES[i].lines.length; j++) {
            const w = lineWidth(S.VERSES[i].lines[j]);
            if (w > maxW) maxW = w;
        }
    }
    S.MAX_W = maxW;
    S.SCALE = Math.min(1, S.CONTENT_W / S.MAX_W);

    /* --------------------------------------------------------------
       6. CONSTRUCCIÓN DE LA VISTA ESTÁTICA Y LISTENERS
          - buildAlphabetGrid: 22 tarjetas del alfabeto.
          - buildVerses:      32 <details> con canvas e índices
                              (primer render con defaults).
          - setupEvents:      registra todos los listeners.
       -------------------------------------------------------------- */
    buildAlphabetGrid();
    buildVerses();
    setupEvents();

    /* --------------------------------------------------------------
       7. CARGA DE PERSISTENCIA
          Orden:
            a) alfabetos guardados,
            b) migración del formato legacy (si procede),
            c) expresiones regulares,
            d) id del alfabeto activo (después de la migración, para
               respetar el id que esta haya podido fijar).
       -------------------------------------------------------------- */
    S.savedAlphabets = loadSavedAlphabets();
    migrateLegacyIfNeeded();
    S.regexPatterns = loadRegexes();

    S.activeAlphabetId = loadActiveId();

    /* --------------------------------------------------------------
       8. RESOLUCIÓN DEL ALFABETO ACTIVO
          Prioridad:
            - si el id existe (preset o guardado) → activarlo;
            - si el id es 'draft' y hay borrador → usar borrador;
            - si el id es 'draft' y no hay borrador → primer preset;
            - si el id no existe y hay borrador → usarlo como 'draft';
            - si el id no existe y no hay borrador → primer preset.
       -------------------------------------------------------------- */
    if (getAlphabetById(S.activeAlphabetId)) {
        setActiveAlphabet(S.activeAlphabetId);
    } else if (S.activeAlphabetId === 'draft') {
        const draft = loadDraft();
        if (draft) {
            S.customAlphabetChars = draft;
            S.currentAlphabet = S.customAlphabetChars.join('');
        } else {
            setActiveAlphabet(S.PRESET_ALPHABETS[0].id);
        }
    } else {
        const draft = loadDraft();
        if (draft) {
            S.customAlphabetChars = draft;
            S.currentAlphabet = S.customAlphabetChars.join('');
            S.activeAlphabetId = 'draft';
            saveActiveId();
        } else {
            setActiveAlphabet(S.PRESET_ALPHABETS[0].id);
        }
    }

    /* --------------------------------------------------------------
       9. CHECKBOXES GUARDADOS
          Se cargan ANTES del render final para que updateVerses()
          use direction/labels/sortLength reales.
       -------------------------------------------------------------- */
    loadCheckboxStates();

    /* --------------------------------------------------------------
       10. RENDER FINAL
           - renderAlphabetSelect: puebla el <select> y ajusta el
                                   estado del botón eliminar.
           - renderAlphabetBuilder: pinta los 22 slots del
                                    constructor (colores, badges,
                                    string inferior).
           - updateVerses: re-renderiza canvas + índices de los 32
                           versículos con las preferencias cargadas,
                           y refresca:
                             · tabla de frecuencias de caracteres,
                             · tabla de palabras (todas),
                             · tabla de palabras (filtradas),
                             · columna de regex + total,
                             · badges de conteo del constructor.

           Nota: renderAlphabetBuilder() ya invoca internamente a
           updateAlphabetCounts(), y updateVerses() vuelve a hacerlo
           vía refreshRegexUI(). La duplicación es intencional y
           barata: garantiza que los badges estén correctos aunque
           en el futuro se altere el orden de arranque.
       -------------------------------------------------------------- */
    renderAlphabetSelect();
    renderAlphabetBuilder();
    updateVerses();
}

programa();
