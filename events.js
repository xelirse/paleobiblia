/* ==================================================================
   EVENTOS, CHECKBOXES Y REFRESCO GLOBAL DE LA VISTA
   ==================================================================
   Este archivo contiene exclusivamente:

     1. Persistencia y carga de los checkbox de preferencias
        (dirección hebrea, usar letras, ordenar por longitud).

     2. Handlers de cambio de esos checkboxes.

     3. updateVerses(): refresco global de la vista tras cambiar
        checkboxes o alfabeto activo. Recalcula canvas de versículos,
        bloques de índices y todas las tablas dependientes.

     4. Toggles de los <details> (alfabeto, versículos) y sus textos.

     5. Handlers del panel de expresiones:
          - alta (input + Enter / botón +),
          - ordenación alfabética (A↓/A↑),
          - ordenación por frecuencia (↓#),
          - ordenación RTL (⇄, solo visible en la pestaña "—$"),
          - pestañas (—, ^—, —$, ^—$).
        Las tres ordenaciones actúan SOLO sobre el subconjunto visible
        (la pestaña activa) y preservan las posiciones absolutas del
        resto de patrones en S.regexPatterns.

     6. setupEvents(): punto único donde se registran TODOS los
        listeners de la aplicación, incluidas las pestañas y el botón
        ⇄ del panel de expresiones.

   Dependencias en runtime:
     - state.js            (getState)
     - regex.js            (addRegex, countMatchingWords,
                            refreshRegexUI, saveRegexes,
                            renderRegexColumn,
                            sortVisibleRegexSubset,
                            reversePatternForSort,
                            syncRegexTabUI,
                            handleRegexTabClick,
                            handleSortRTLClick)
     - frequency-tables.js (renderFrequencyTable)
     - verses.js           (buildVerseCanvas, getVerseIndicesTextByMode)
     - alphabet.js         (renderAlphabetSelect, renderAlphabetBuilder,
                            handleAlphabetSelectChange,
                            handleAddAlphabetClick,
                            handleDeleteAlphabetClick,
                            handleCopyAlphabetClick,
                            applyCustomAlphabet)
     - random-alphabet.js  (handleRandomAlphabetClick)

   Se carga después de todos los módulos anteriores y antes de
   main.js (que llama a setupEvents() desde programa()).
   ================================================================== */

/* ==================================================================
   1. CHECKBOX DE PREFERENCIAS: CARGA Y GUARDADO
   ================================================================== */
function loadCheckboxStates() {
    const S = getState();
    try {
        if (localStorage.getItem(S.STATE_STORAGE_KEYS.direction) === 'true') {
            S.dom.toggleDirection.checked = true;
        }
        if (localStorage.getItem(S.STATE_STORAGE_KEYS.labels) === 'true') {
            S.dom.toggleLabels.checked = true;
        }
        if (localStorage.getItem(S.STATE_STORAGE_KEYS.sortLength) === 'true') {
            S.dom.toggleSortLength.checked = true;
        }
    } catch (e) {}
}

function saveCheckboxState(key, val) {
    try { localStorage.setItem(key, val ? 'true' : 'false'); } catch (e) {}
}

/* ==================================================================
   2. HANDLERS DE CAMBIO DE CHECKBOX
   ================================================================== */
function handleToggleDirectionChange() {
    const S = getState();
    saveCheckboxState(S.STATE_STORAGE_KEYS.direction, S.dom.toggleDirection.checked);
    updateVerses();
}

function handleToggleLabelsChange() {
    const S = getState();
    saveCheckboxState(S.STATE_STORAGE_KEYS.labels, S.dom.toggleLabels.checked);
    updateVerses();
}

function handleToggleSortLengthChange() {
    const S = getState();
    saveCheckboxState(S.STATE_STORAGE_KEYS.sortLength, S.dom.toggleSortLength.checked);
    updateVerses();
}

/* ==================================================================
   3. REFRESCO GLOBAL DE LA VISTA
   ==================================================================
   Punto único de re-render tras cambiar checkboxes o alfabeto.

   Recorre S.verseRefs (poblado por buildVerses()) y, para cada
   versículo:
     - actualiza el contenido de los 3 bloques de índices
       (auto / A-V / hebreo) con la orientación correcta,
     - actualiza la etiqueta del bloque 'auto' según el checkbox
       “Usar letras”,
     - destruye el canvas anterior y construye uno nuevo con las
       letras o índices correspondientes.

   Después refresca:
     - la tabla de frecuencias de caracteres (depende de showLetters),
     - todo lo que depende de las regex y del alfabeto activo, vía
       refreshRegexUI() (que a su vez refresca las dos tablas de
       palabras y los badges de conteo del constructor).

   Nota: refreshRegexUI() re-renderiza la columna de expresiones, lo
   que descarta cualquier edición inline en curso. Es aceptable: el
   usuario no puede editar una regex y cambiar un checkbox al mismo
   tiempo, y en el peor caso la edición se cancela silenciosamente.
   ================================================================== */
function updateVerses() {
    const S = getState();
    const isHebrewLayout = S.dom.toggleDirection.checked;
    const showLetters    = S.dom.toggleLabels.checked;

    for (let i = 0; i < S.verseRefs.length; i++) {
        const ref = S.verseRefs[i];
        const refs         = ref.refs;
        const canvasWrapper = ref.canvasWrapper;
        const verse        = ref.verse;

        for (let j = 0; j < refs.length; j++) {
            const codeEl  = refs[j].codeEl;
            const mode    = refs[j].mode;
            const labelEl = refs[j].labelEl;
            const actualMode = (mode === 'auto')
                ? (showLetters ? 'letter' : 'number')
                : mode;

            codeEl.classList.toggle('rtl', isHebrewLayout);
            codeEl.textContent = getVerseIndicesTextByMode(verse, isHebrewLayout, actualMode);

            if (mode === 'auto') {
                labelEl.textContent = showLetters ? 'Alfabeto actual' : 'Números';
            }
        }

        canvasWrapper.innerHTML = '';
        const newCanvas = buildVerseCanvas(verse, showLetters);
        canvasWrapper.appendChild(newCanvas);
    }

    // Tabla de caracteres: depende de showLetters (modo letra / número).
    renderFrequencyTable(showLetters);

    // Todo lo dependiente de regex + alfabeto activo, en un solo punto.
    refreshRegexUI();
}

/* ==================================================================
   4. TOGGLES DE <details>
   ================================================================== */
function handleToggleAlphabetClick() {
    const S = getState();
    const isOpen = S.dom.alphabetDetails.open;
    S.dom.alphabetDetails.open = !isOpen;
    S.dom.toggleAlphabetBtn.textContent = isOpen ? 'Expandir Abecedario' : 'Ocultar Abecedario';
}

function handleToggleVersesClick() {
    const S = getState();
    let allOpen = true;
    const allVerseDetails = S.dom.versesContainer.querySelectorAll('details');
    for (let i = 0; i < allVerseDetails.length; i++) {
        if (!allVerseDetails[i].open) allOpen = false;
    }
    const shouldOpen = !allOpen;
    for (let i = 0; i < allVerseDetails.length; i++) {
        allVerseDetails[i].open = shouldOpen;
    }
    S.dom.toggleVersesBtn.textContent = shouldOpen
        ? 'Ocultar todos los Versículos'
        : 'Expandir todos los Versículos';
}

/* ==================================================================
   5. PANEL DE EXPRESIONES: ALTA Y ORDENACIÓN
   ==================================================================
   Las tres ordenaciones (alfabética, por frecuencia, RTL) se aplican
   SOLO a la pestaña activa usando sortVisibleRegexSubset, que
   preserva las posiciones absolutas del resto de patrones en
   S.regexPatterns.

   Para la pestaña '—$' con S.regexRTL activo, la comparación se hace
   sobre reversePatternForSort(patrón) (p. ej. "CD$" → "DC"). El
   sentido (asc/desc) lo controla S.isAlphaAsc, igual que en el resto
   de pestañas. La ordenación por frecuencia NO usa RTL: cuenta
   coincidencias sin importar la orientación.
   ================================================================== */

/* ---- Alta manual (input + botón + / Enter) ---- */
function handleRegexAddClick() {
    const S = getState();
    addRegex(S.dom.regexInput.value);
    S.dom.regexInput.value = '';
    S.dom.regexInput.focus();
}

function handleRegexInputKeydown(e) {
    const S = getState();
    if (e.key === 'Enter') {
        e.preventDefault();
        addRegex(S.dom.regexInput.value);
        S.dom.regexInput.value = '';
    }
}

/* ---- Orden alfabético (A↓ / A↑) ---- */
function handleSortAlphaClick() {
    const S = getState();
    S.isAlphaAsc = !S.isAlphaAsc;
    S.dom.sortAlphaBtn.textContent = S.isAlphaAsc ? 'A↓' : 'A↑';
    S.dom.sortAlphaBtn.title = `Ordenar alfabéticamente (${S.isAlphaAsc ? 'A-Z' : 'Z-A'}) — pestaña actual`;

    const useRTL = S.regexRTL && S.activeRegexTab === 'end';

    sortVisibleRegexSubset(function (a, b) {
        const ka = useRTL ? reversePatternForSort(a) : a;
        const kb = useRTL ? reversePatternForSort(b) : b;
        if (ka === kb) return 0;
        return S.isAlphaAsc ? (ka > kb ? 1 : -1) : (ka < kb ? 1 : -1);
    });

    saveRegexes();
    renderRegexColumn();
    showToast('Expresiones ordenadas alfabéticamente.', 'info', 2000);
}

/* ---- Orden por frecuencia de coincidencias (↓# / ↑#) ---- */
function handleSortFreqClick() {
    const S = getState();
    S.isFreqAsc = !S.isFreqAsc;
    S.dom.sortFreqBtn.textContent = S.isFreqAsc ? '↑#' : '↓#';
    S.dom.sortFreqBtn.title = `Ordenar por coincidencias (${S.isFreqAsc ? 'asc' : 'desc'}) — pestaña actual`;

    sortVisibleRegexSubset(function (a, b) {
        const countA = countMatchingWords(a);
        const countB = countMatchingWords(b);
        return S.isFreqAsc ? countA - countB : countB - countA;
    });

    saveRegexes();
    renderRegexColumn();
    showToast('Expresiones ordenadas por coincidencias.', 'info', 2000);
}

/* ==================================================================
   6. REGISTRO DE TODOS LOS LISTENERS
   ==================================================================
   Punto único donde se enganchan los handlers a los elementos del
   DOM. Se invoca una sola vez desde programa() (main.js), después
   de que S.dom.* haya sido rellenado.

   Orden por bloques:
     - toggles de <details> y checkbox de preferencias,
     - panel de regex: input, ordenaciones, pestañas y botón ⇄,
     - botones del selector de abecedario,
     - selector <select>,
     - botones 🎲 y 📋.
   ================================================================== */
function setupEvents() {
    const S = getState();

    /* --- Toggles y preferencias --- */
    S.dom.toggleAlphabetBtn.addEventListener('click', handleToggleAlphabetClick);
    S.dom.toggleVersesBtn.addEventListener('click', handleToggleVersesClick);
    S.dom.toggleDirection.addEventListener('change', handleToggleDirectionChange);
    S.dom.toggleLabels.addEventListener('change', handleToggleLabelsChange);
    S.dom.toggleSortLength.addEventListener('change', handleToggleSortLengthChange);

    /* --- Panel de expresiones regulares --- */
    S.dom.regexAddBtn.addEventListener('click', handleRegexAddClick);
    S.dom.regexInput.addEventListener('keydown', handleRegexInputKeydown);
    S.dom.sortAlphaBtn.addEventListener('click', handleSortAlphaClick);
    S.dom.sortFreqBtn.addEventListener('click', handleSortFreqClick);

    /* --- Pestañas de expresiones regulares --- */
    const regexTabs = document.querySelectorAll('.regex-tab');
    for (let i = 0; i < regexTabs.length; i++) {
        regexTabs[i].addEventListener('click', handleRegexTabClick);
    }
    // Sincroniza la clase .active y la visibilidad del botón ⇄ con
    // el estado persistido (por defecto 'none', RTL false).
    syncRegexTabUI();

    /* --- Botón ⇄ (orden RTL, solo visible en la pestaña '—$') --- */
    const sortRTLBtn = document.getElementById('btn-sort-regex-rtl');
    if (sortRTLBtn) {
        sortRTLBtn.addEventListener('click', handleSortRTLClick);
    }

    /* --- Selector de abecedario --- */
    S.dom.alphabetSelect.addEventListener('change', handleAlphabetSelectChange);
    S.dom.addAlphabetBtn.addEventListener('click', handleAddAlphabetClick);
    S.dom.delAlphabetBtn.addEventListener('click', handleDeleteAlphabetClick);

    /* --- Botones 🎲 y 📋 --- */
    S.dom.randomAlphabetBtn.addEventListener('click', handleRandomAlphabetClick);
    S.dom.copyAlphabetBtn.addEventListener('click', handleCopyAlphabetClick);
}
