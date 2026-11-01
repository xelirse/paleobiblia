/* ==================================================================
   GESTIÓN DE EXPRESIONES REGULARES
   ==================================================================
   Este archivo contiene exclusivamente todo lo relacionado con las
   expresiones regulares:

     1. Persistencia en localStorage (load/save).
     2. Validación y alta/baja.
     3. Conteo de palabras coincidentes.
     4. Categorización por anclaje (^ / $) para las pestañas.
     5. Render de la columna de expresiones (lista lateral),
        filtrada por la pestaña activa.
     6. Resaltado de coincidencias dentro de una palabra.
     7. Edición inline (lápiz → input → ✔️).
     8. Drag & drop para reordenar (dentro de la pestaña activa).
     9. Ordenación alfabética / por frecuencia / RTL de la pestaña
        activa, preservando las posiciones del resto.
    10. Pestañas (—, ^—, —$, ^—$) y botón ⇄ (solo pestaña —$).
    11. refreshRegexUI(): punto único para refrescar todo lo que
        depende de las regex.

   Categorías de anclaje:
     - 'none'  → no empieza con ^ ni termina con $   → pestaña "—"
     - 'start' → empieza con ^, no termina con $     → pestaña "^—"
     - 'end'   → termina con $, no empieza con ^     → pestaña "—$"
     - 'both'  → empieza con ^ y termina con $       → pestaña "^—$"

   Orden RTL (pestaña 'end'): cuando S.regexRTL es true, las
   comparaciones alfabéticas se hacen sobre el patrón invertido
   (ignorando el $ final). Ej.: "CD$" se compara como "DC",
   "DB$" se compara como "BD". El sentido (asc/desc) lo controla
   S.isAlphaAsc, igual que en el resto de pestañas.

   Dependencias en tiempo de ejecución:
     - state.js             (getState)
     - utils.js             (wordToLetterString, escapeHtml)
     - ui.js                (showToast)
     - frequency-tables.js  (renderWordFrequencyTable,
                             renderFilteredWordFrequencyTable)
     - alphabet.js          (updateAlphabetCounts)

   Se carga después de state.js y antes de events.js.
   ================================================================== */

/* ==================================================================
   1. PERSISTENCIA
   ================================================================== */
function loadRegexes() {
    const S = getState();
    const result = [];
    try {
        const raw = localStorage.getItem(S.REGEX_STORAGE_KEY);
        if (raw === null) return S.DEFAULT_REGEXES.slice();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return S.DEFAULT_REGEXES.slice();
        for (let i = 0; i < parsed.length; i++) {
            result.push(parsed[i]);
        }
    } catch (e) {
        return S.DEFAULT_REGEXES.slice();
    }
    return result;
}

function saveRegexes() {
    const S = getState();
    localStorage.setItem(S.REGEX_STORAGE_KEY, JSON.stringify(S.regexPatterns));
}

/* ==================================================================
   2. VALIDACIÓN Y ALTA/BAJA
   ================================================================== */
function isValidRegex(pattern) {
    try { new RegExp(pattern); return true; } catch (e) { return false; }
}

function addRegex(pattern) {
    const S = getState();
    pattern = pattern.trim();
    if (!pattern) return;
    if (!isValidRegex(pattern)) {
        showToast('Expresión regular inválida: ' + pattern, 'error');
        return;
    }
    if (S.regexPatterns.indexOf(pattern) !== -1) return;
    S.regexPatterns.push(pattern);

    // Si la nueva expresión pertenece a otra pestaña, saltamos a ella
    // para que el usuario vea lo que acaba de añadir.
    const cat = getRegexCategory(pattern);
    if (cat !== S.activeRegexTab) {
        S.activeRegexTab = cat;
        syncRegexTabUI();
    }

    saveRegexes();
    refreshRegexUI();
}

function removeRegex(pattern) {
    const S = getState();
    const newPatterns = [];
    for (let i = 0; i < S.regexPatterns.length; i++) {
        if (S.regexPatterns[i] !== pattern) newPatterns.push(S.regexPatterns[i]);
    }
    S.regexPatterns = newPatterns;
    saveRegexes();
    refreshRegexUI();
}

/* ==================================================================
   3. CONTEO DE PALABRAS COINCIDENTES
   ================================================================== */
function countMatchingWords(pattern) {
    const S = getState();
    let re;
    try { re = new RegExp(pattern); } catch (e) { return 0; }
    let count = 0;
    const keys = Object.keys(S.WORD_FREQUENCIES);
    for (let i = 0; i < keys.length; i++) {
        const display = wordToLetterString(keys[i]);
        if (re.test(display)) count++;
    }
    return count;
}

function wordMatchesAnyRegex(text) {
    const S = getState();
    for (let i = 0; i < S.regexPatterns.length; i++) {
        let re;
        try { re = new RegExp(S.regexPatterns[i]); } catch (e) { continue; }
        if (re.test(text)) return true;
    }
    return false;
}

/* ==================================================================
   4. CATEGORIZACIÓN POR ANCLAJE (para las pestañas)
   ================================================================== */

/**
 * Devuelve la categoría de anclaje de un patrón:
 *   'both'  → ^…$   'start' → ^…   'end' → …$   'none' → …
 */
function getRegexCategory(pattern) {
    if (!pattern) return 'none';
    const startsCaret = pattern.charAt(0) === '^';
    const endsDollar  = pattern.charAt(pattern.length - 1) === '$';
    if (startsCaret && endsDollar) return 'both';
    if (startsCaret)               return 'start';
    if (endsDollar)                return 'end';
    return 'none';
}

/**
 * Clave de comparación RTL: invierte el patrón, ignorando un '$'
 * final. Se usa solo en la pestaña 'end' cuando S.regexRTL es true.
 *   "CD$" → "DC"      "DB$" → "BD"      "ABC" → "CBA"
 */
function reversePatternForSort(pattern) {
    if (!pattern) return '';
    if (pattern.charAt(pattern.length - 1) === '$') {
        return pattern.slice(0, -1).split('').reverse().join('');
    }
    return pattern.split('').reverse().join('');
}

/**
 * Devuelve los patrones que pertenecen a la pestaña activa, junto
 * con su índice GLOBAL en S.regexPatterns (necesario para que las
 * operaciones de edición/borrado/drag apunten al elemento correcto
 * aunque el render esté filtrado).
 */
function getVisibleRegexEntries() {
    const S = getState();
    const result = [];
    for (let i = 0; i < S.regexPatterns.length; i++) {
        if (getRegexCategory(S.regexPatterns[i]) === S.activeRegexTab) {
            result.push({ pattern: S.regexPatterns[i], globalIndex: i });
        }
    }
    return result;
}

/**
 * Ordena EN SITIO solo el subconjunto visible (pestaña activa),
 * preservando las posiciones absolutas del resto de patrones.
 *
 * Estrategia:
 *   1. Se recogen los índices globales de los visibles.
 *   2. Se extrae el subconjunto, se ordena con `comparator`.
 *   3. Se vuelve a escribir en los mismos índices globales.
 *
 * Así, el orden relativo entre pestañas no se ve alterado por
 * ordenar una sola de ellas.
 */
function sortVisibleRegexSubset(comparator) {
    const S = getState();
    const indices = [];
    for (let i = 0; i < S.regexPatterns.length; i++) {
        if (getRegexCategory(S.regexPatterns[i]) === S.activeRegexTab) {
            indices.push(i);
        }
    }
    const subset = indices.map(function (i) { return S.regexPatterns[i]; });
    subset.sort(comparator);
    for (let i = 0; i < indices.length; i++) {
        S.regexPatterns[indices[i]] = subset[i];
    }
}

/* ==================================================================
   5. PESTAÑAS: SINCRONIZACIÓN DE UI Y HANDLERS
   ================================================================== */

/**
 * Sincroniza el estado visual de las pestañas y la visibilidad del
 * botón ⇄ con S.activeRegexTab. No re-renderiza la lista; eso lo
 * hacen los llamadores.
 */
function syncRegexTabUI() {
    const S = getState();

    const tabs = document.querySelectorAll('.regex-tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].dataset.tab === S.activeRegexTab);
    }

    const rtlBtn = document.getElementById('btn-sort-regex-rtl');
    if (rtlBtn) {
        rtlBtn.style.display = (S.activeRegexTab === 'end') ? '' : 'none';
        rtlBtn.classList.toggle('active', !!S.regexRTL);
    }
}

function handleRegexTabClick(e) {
    const S = getState();
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === S.activeRegexTab) return;

    // Cualquier edición inline en curso se cancela al cambiar de pestaña.
    cancelRegexEdit();

    S.activeRegexTab = tab;
    syncRegexTabUI();
    renderRegexColumn();
}

function handleSortRTLClick() {
    const S = getState();
    S.regexRTL = !S.regexRTL;

    const rtlBtn = document.getElementById('btn-sort-regex-rtl');
    if (rtlBtn) {
        rtlBtn.classList.toggle('active', S.regexRTL);
        rtlBtn.title = S.regexRTL
            ? 'Orden RTL activo: las expresiones se comparan de derecha a izquierda'
            : 'Activar orden de derecha a izquierda';
    }

    if (S.regexRTL) {
        sortVisibleRegexSubset(function (a, b) {
            const ka = reversePatternForSort(a);
            const kb = reversePatternForSort(b);
            if (ka === kb) return 0;
            return S.isAlphaAsc ? (ka > kb ? 1 : -1) : (ka < kb ? 1 : -1);
        });
        saveRegexes();
        showToast('Expresiones ordenadas de derecha a izquierda.', 'info', 2000);
    }
    renderRegexColumn();
}

/* ==================================================================
   6. RENDER DE LA COLUMNA DE EXPRESIONES (FILTRADA POR PESTAÑA)
   ================================================================== */

/**
 * Pinta la lista lateral con los patrones de la pestaña activa.
 *
 * Importante: `item.dataset.index` guarda el índice GLOBAL (no la
 * posición visual), de forma que handlers como copiar / eliminar /
 * editar / drag siempre apuntan al patrón correcto del array
 * completo.
 */
function renderRegexColumn() {
    const S = getState();
    const list = document.getElementById('regex-list');
    list.innerHTML = '';

    const entries = getVisibleRegexEntries();

    if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:0.8rem;color:#bdc3c7;text-align:center;padding:10px;';
        empty.textContent = 'Sin expresiones en esta categoría';
        list.appendChild(empty);
        return;
    }

    for (let k = 0; k < entries.length; k++) {
        const pattern = entries[k].pattern;
        const globalIndex = entries[k].globalIndex;

        const item = document.createElement('div');
        item.className = 'regex-item';
        item.draggable = true;
        item.dataset.index = globalIndex;

        const pat = document.createElement('span');
        pat.className = 'regex-pattern';
        pat.textContent = pattern;
        pat.title = pattern;

        const cnt = document.createElement('span');
        cnt.className = 'regex-count';
        cnt.textContent = countMatchingWords(pattern);

        const editBtn = document.createElement('button');
        editBtn.className = 'regex-edit';
        editBtn.textContent = '✏️';
        editBtn.title = 'Editar';
        editBtn.addEventListener('click', handleRegexEditClick);

        const doneBtn = document.createElement('button');
        doneBtn.className = 'regex-done';
        doneBtn.textContent = '✔️';
        doneBtn.title = 'Listo';
        doneBtn.style.display = 'none';
        doneBtn.addEventListener('click', handleRegexDoneClick);

        const cp = document.createElement('button');
        cp.className = 'regex-copy';
        cp.textContent = '📋';
        cp.title = 'Copiar expresión';
        cp.addEventListener('click', handleRegexCopyClick);

        const rm = document.createElement('button');
        rm.className = 'regex-remove';
        rm.textContent = '×';
        rm.title = 'Eliminar';
        rm.addEventListener('click', handleRegexRemoveClick);

        item.addEventListener('dragstart', handleRegexDragStart);
        item.addEventListener('dragover', handleRegexDragOver);
        item.addEventListener('dragleave', handleRegexDragLeave);
        item.addEventListener('drop', handleRegexDrop);
        item.addEventListener('dragend', handleRegexDragEnd);

        item.appendChild(pat);
        item.appendChild(cnt);
        item.appendChild(editBtn);
        item.appendChild(doneBtn);
        item.appendChild(cp);
        item.appendChild(rm);
        list.appendChild(item);
    }
}

function updateRegexTotal() {
    const S = getState();
    const totalWords = Object.keys(S.WORD_FREQUENCIES).length;
    let matching = 0;
    const keys = Object.keys(S.WORD_FREQUENCIES);
    for (let i = 0; i < keys.length; i++) {
        if (wordMatchesAnyRegex(wordToLetterString(keys[i]))) matching++;
    }
    document.getElementById('regex-total').textContent = `${matching} / ${totalWords}`;
    document.getElementById('filtered-count').textContent = matching;
}

/* ==================================================================
   7. RESALTADO DE COINCIDENCIAS DENTRO DE UNA PALABRA
   ==================================================================
   Marca en rojo los caracteres cubiertos por alguna regex y en
   verde el resto. Maneja correctamente regex que matchean strings
   vacíos (avanzando lastIndex) y regex globales con lastIndex
   residual.
   ================================================================== */
function highlightWord(text) {
    const S = getState();
    if (text.length === 0) return '';
    const mask = new Array(text.length).fill(false);

    for (let p = 0; p < S.regexPatterns.length; p++) {
        let re;
        try { re = new RegExp(S.regexPatterns[p], 'g'); } catch (e) { continue; }
        let m;
        while ((m = re.exec(text)) !== null) {
            if (m[0].length === 0) { re.lastIndex++; continue; }
            for (let i = m.index; i < m.index + m[0].length; i++) {
                mask[i] = true;
            }
            if (m.index === re.lastIndex) re.lastIndex++;
        }
    }

    let html = '';
    let i = 0;
    while (i < text.length) {
        const red = mask[i];
        let j = i;
        while (j < text.length && mask[j] === red) j++;
        const chunk = escapeHtml(text.slice(i, j));
        html += `<span class="${red ? 'match-red' : 'match-green'}">${chunk}</span>`;
        i = j;
    }
    return html;
}

/* ==================================================================
   8. EDICIÓN INLINE
   ================================================================== */

function cancelRegexEdit() {
    const S = getState();
    if (!S.activeRegexItem) return;

    S.activeRegexItem.draggable = true;

    const patSpan   = S.activeRegexItem.querySelector('.regex-pattern');
    const editBtn   = S.activeRegexItem.querySelector('.regex-edit');
    const copyBtn   = S.activeRegexItem.querySelector('.regex-copy');
    const removeBtn = S.activeRegexItem.querySelector('.regex-remove');
    const doneBtn   = S.activeRegexItem.querySelector('.regex-done');

    if (patSpan)   patSpan.style.display   = '';
    if (editBtn)   editBtn.style.display   = 'flex';
    if (copyBtn)   copyBtn.style.display   = 'flex';
    if (removeBtn) removeBtn.style.display = 'flex';
    if (doneBtn)   doneBtn.style.display   = 'none';

    if (S.activeRegexInput && S.activeRegexInput.parentNode) {
        S.activeRegexInput.remove();
    }

    S.activeRegexItem  = null;
    S.activeRegexInput = null;
    S.activeRegexIndex = -1;
}

function finishRegexEdit() {
    const S = getState();
    if (!S.activeRegexItem) return;

    const newPattern = S.activeRegexInput.value.trim();
    const oldPattern = S.regexPatterns[S.activeRegexIndex];

    if (newPattern === oldPattern) {
        cancelRegexEdit();
        return;
    }
    if (!isValidRegex(newPattern)) {
        showToast('Expresión regular inválida.', 'error');
        return;
    }
    if (S.regexPatterns.indexOf(newPattern) !== -1) {
        showToast('Esta expresión ya existe en la lista.', 'error');
        return;
    }

    S.regexPatterns[S.activeRegexIndex] = newPattern;
    saveRegexes();

    // El nodo del ítem se va a reemplazar en el próximo render;
    // limpiamos las referencias antes de re-renderizar para no dejar
    // punteros colgantes (más aún si el patrón cambia de categoría).
    S.activeRegexItem  = null;
    S.activeRegexInput = null;
    S.activeRegexIndex = -1;

    refreshRegexUI();
}

function handleRegexEditKeydown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); finishRegexEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelRegexEdit(); }
}

function handleRegexDoneClick() {
    finishRegexEdit();
}

function startRegexEdit(item, pattern) {
    const S = getState();

    // Si había otra edición activa, la cancelamos antes de empezar.
    if (S.activeRegexItem) cancelRegexEdit();

    S.activeRegexItem  = item;
    S.activeRegexIndex = Number(item.dataset.index);

    item.draggable = false;

    const patSpan   = item.querySelector('.regex-pattern');
    const editBtn   = item.querySelector('.regex-edit');
    const copyBtn   = item.querySelector('.regex-copy');
    const removeBtn = item.querySelector('.regex-remove');
    const doneBtn   = item.querySelector('.regex-done');

    patSpan.style.display   = 'none';
    editBtn.style.display   = 'none';
    copyBtn.style.display   = 'none';
    removeBtn.style.display = 'none';
    doneBtn.style.display   = 'flex';

    S.activeRegexInput = document.createElement('input');
    S.activeRegexInput.type = 'text';
    S.activeRegexInput.className = 'regex-input';
    S.activeRegexInput.value = pattern;

    S.activeRegexInput.addEventListener('keydown', handleRegexEditKeydown);
    item.insertBefore(S.activeRegexInput, patSpan);
    S.activeRegexInput.focus();
    S.activeRegexInput.select();
}

function handleRegexEditClick(e) {
    const S = getState();
    const item = e.currentTarget.parentElement;
    const index = Number(item.dataset.index);
    startRegexEdit(item, S.regexPatterns[index]);
}

/* ==================================================================
   9. DRAG & DROP PARA REORDENAR
   ==================================================================
   El drop mueve el patrón en S.regexPatterns (índices GLOBALES)
   entre dos posiciones del array completo. Como el render está
   filtrado por pestaña, el cálculo de la nueva posición se hace en
   términos de índices globales, no visuales.
   ================================================================== */
function handleRegexDragStart(e) {
    const S = getState();
    S.draggedRegexIndex = Number(e.currentTarget.dataset.index);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(S.draggedRegexIndex));
}

function handleRegexDragOver(e) {
    const S = getState();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (Number(e.currentTarget.dataset.index) !== S.draggedRegexIndex) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleRegexDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleRegexDrop(e) {
    const S = getState();
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const targetIndex = Number(e.currentTarget.dataset.index);
    if (S.draggedRegexIndex !== null && S.draggedRegexIndex !== targetIndex) {
        const moved = S.regexPatterns.splice(S.draggedRegexIndex, 1)[0];
        S.regexPatterns.splice(targetIndex, 0, moved);
        saveRegexes();
        refreshRegexUI();
    }
    S.draggedRegexIndex = null;
}

function handleRegexDragEnd(e) {
    const S = getState();
    e.currentTarget.classList.remove('dragging');
    const items = document.querySelectorAll('.regex-item');
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove('drag-over');
    }
    S.draggedRegexIndex = null;
}

/* ==================================================================
   10. BOTONES POR ÍTEM: COPIAR Y ELIMINAR
   ================================================================== */
function handleRegexCopySuccess() {
    showToast('Expresión copiada.', 'success', 1000);
}

function handleRegexCopyClick(e) {
    const S = getState();
    const index = Number(e.currentTarget.parentElement.dataset.index);
    const pattern = S.regexPatterns[index];
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pattern).then(handleRegexCopySuccess);
    } else {
        const ta = document.createElement('textarea');
        ta.value = pattern;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        handleRegexCopySuccess();
    }
}

function handleRegexRemoveClick(e) {
    const S = getState();
    const index = Number(e.currentTarget.parentElement.dataset.index);
    const pattern = S.regexPatterns[index];
    removeRegex(pattern);
}

/* ==================================================================
   11. REFRESCO GLOBAL DEPENDIENTE DE LAS REGEX
   ==================================================================
   Punto único que debe llamarse tras cualquier cambio en
   S.regexPatterns. Actualiza:
     - la columna de expresiones (con sus contadores),
     - el total de coincidencias,
     - la tabla de palabras completa y la filtrada,
     - los badges de conteo del constructor de abecedario.
   ================================================================== */
function refreshRegexUI() {
    const S = getState();
    renderRegexColumn();
    updateRegexTotal();
    renderWordFrequencyTable(S.dom.toggleSortLength.checked);
    renderFilteredWordFrequencyTable(S.dom.toggleSortLength.checked);
    updateAlphabetCounts();
}
