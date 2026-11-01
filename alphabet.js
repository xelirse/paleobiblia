/* ==================================================================
   GESTIÓN DEL ABECEDARIO (persistencia, selector, constructor, copia)
   ==================================================================
   Este archivo contiene exclusivamente todo lo relacionado con el
   abecedario personalizado (22 posiciones mapeadas a las letras
   paleohebreas 1..22):

     1. Persistencia en localStorage (guardados, borrador, activo,
        migración del formato legacy).
     2. Helpers de consulta (getAlphabetById, isSavedAlphabet,
        sanitizeAlphabetChars).
     3. Selector <select> y estado del botón eliminar.
     4. Constructor de abecedario (render de los 22 slots, colores
        cian/magenta, badges de conteo, input, flechas, drag & drop,
        string inferior, botón copiar).
     5. Alta y baja de abecedarios guardados (con modal de
        confirmación/nombre).
     6. Conteo de palabras coincidentes para un alfabeto dado
        (wordDisplayWith / countMatchingWordsForAlphabet), usado por
        random-alphabet.js.

   NO incluye la generación aleatoria de abecedarios: eso vive en
   random-alphabet.js.

   Dependencias en runtime:
     - state.js            (getState)
     - utils.js            (wordToLetterString, no usado directamente)
     - ui.js               (showToast, showModal)
     - regex.js            (wordMatchesAnyRegex)
     - frequency-tables.js (no usado directamente desde aquí; las
                            tablas se refrescan vía updateVerses())
     - events.js           (updateVerses)  ← se llama desde
                            applyCustomAlphabet y handleAlphabetSelectChange
     - draw.js             (alphabetData, para renderAlphabetBuilder)

   Se carga después de regex.js y frequency-tables.js, y antes de
   random-alphabet.js (que usa countMatchingWordsForAlphabet).
   ================================================================== */

/* ==================================================================
   1. PERSISTENCIA EN localStorage
   ================================================================== */

/**
 * Normaliza un array de caracteres a exactamente 22 posiciones,
 * cada una en mayúscula y con un solo carácter (o cadena vacía).
 * No toca el estado, solo devuelve una copia saneada.
 */
function sanitizeAlphabetChars(arr) {
    const result = [];
    const len = arr ? arr.length : 0;
    for (let i = 0; i < len; i++) {
        const s = (arr[i] === undefined || arr[i] === null) ? '' : String(arr[i]);
        result.push(s.toUpperCase().slice(0, 1));
    }
    while (result.length < 22) result.push('');
    return result.slice(0, 22);
}

function loadSavedAlphabets() {
    const S = getState();
    const result = [];
    try {
        const raw = localStorage.getItem(S.SAVED_ALPHABETS_KEY);
        if (!raw) return result;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return result;
        for (let i = 0; i < parsed.length; i++) {
            const a = parsed[i];
            if (a && typeof a.id === 'string' && Array.isArray(a.chars)) {
                result.push({
                    id: a.id,
                    name: typeof a.name === 'string' && a.name.trim() ? a.name : 'Sin nombre',
                    chars: sanitizeAlphabetChars(a.chars)
                });
            }
        }
    } catch (e) {}
    return result;
}

function saveSavedAlphabets() {
    const S = getState();
    try {
        localStorage.setItem(S.SAVED_ALPHABETS_KEY, JSON.stringify(S.savedAlphabets));
    } catch (e) {}
}

function loadDraft() {
    const S = getState();
    try {
        const raw = localStorage.getItem(S.DRAFT_ALPHABET_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? sanitizeAlphabetChars(parsed) : null;
    } catch (e) { return null; }
}

function saveDraft() {
    const S = getState();
    try {
        localStorage.setItem(S.DRAFT_ALPHABET_KEY, JSON.stringify(S.customAlphabetChars));
    } catch (e) {}
}

function saveActiveId() {
    const S = getState();
    try {
        localStorage.setItem(S.ACTIVE_ALPHABET_KEY, S.activeAlphabetId || '');
    } catch (e) {}
}

function loadActiveId() {
    const S = getState();
    try { return localStorage.getItem(S.ACTIVE_ALPHABET_KEY); }
    catch (e) { return null; }
}

/**
 * Migración one-shot del formato legacy: si no existe la clave de
 * "alfabetos guardados" pero sí la de "borrador", convierte el
 * borrador en un abecedario guardado llamado "Personalizado" y lo
 * deja activo.
 */
function migrateLegacyIfNeeded() {
    const S = getState();
    try {
        if (localStorage.getItem(S.SAVED_ALPHABETS_KEY)) return;
        const legacy = localStorage.getItem(S.DRAFT_ALPHABET_KEY);
        if (!legacy) return;
        const chars = JSON.parse(legacy);
        if (!Array.isArray(chars)) return;
        const migrated = {
            id: 'saved:' + Date.now(),
            name: 'Personalizado',
            chars: sanitizeAlphabetChars(chars)
        };
        S.savedAlphabets = [migrated];
        saveSavedAlphabets();
        S.activeAlphabetId = migrated.id;
        saveActiveId();
    } catch (e) {}
}

/* ==================================================================
   2. HELPERS DE CONSULTA
   ================================================================== */

function getAlphabetById(id) {
    const S = getState();
    if (!id) return null;
    for (let i = 0; i < S.PRESET_ALPHABETS.length; i++) {
        if (S.PRESET_ALPHABETS[i].id === id) return S.PRESET_ALPHABETS[i];
    }
    for (let i = 0; i < S.savedAlphabets.length; i++) {
        if (S.savedAlphabets[i].id === id) return S.savedAlphabets[i];
    }
    return null;
}

function isSavedAlphabet(id) {
    const S = getState();
    for (let i = 0; i < S.savedAlphabets.length; i++) {
        if (S.savedAlphabets[i].id === id) return true;
    }
    return false;
}

/* ==================================================================
   3. SELECTOR DE ABECEDARIO Y BOTÓN ELIMINAR
   ================================================================== */

function renderAlphabetSelect() {
    const S = getState();
    S.dom.alphabetSelect.innerHTML = '';

    const ogPresets = document.createElement('optgroup');
    ogPresets.label = 'Presets';
    for (let i = 0; i < S.PRESET_ALPHABETS.length; i++) {
        const p = S.PRESET_ALPHABETS[i];
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        ogPresets.appendChild(opt);
    }
    S.dom.alphabetSelect.appendChild(ogPresets);

    if (S.savedAlphabets.length > 0) {
        const ogSaved = document.createElement('optgroup');
        ogSaved.label = 'Guardados';
        for (let i = 0; i < S.savedAlphabets.length; i++) {
            const a = S.savedAlphabets[i];
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.name;
            ogSaved.appendChild(opt);
        }
        S.dom.alphabetSelect.appendChild(ogSaved);
    }

    if (S.activeAlphabetId === 'draft') {
        const ogDraft = document.createElement('optgroup');
        ogDraft.label = 'Sin guardar';
        const opt = document.createElement('option');
        opt.value = 'draft';
        opt.textContent = 'Borrador';
        ogDraft.appendChild(opt);
        S.dom.alphabetSelect.appendChild(ogDraft);
    }

    S.dom.alphabetSelect.value = S.activeAlphabetId || S.PRESET_ALPHABETS[0].id;
    updateDeleteButtonState();
}

function updateDeleteButtonState() {
    const S = getState();
    S.dom.delAlphabetBtn.disabled = !isSavedAlphabet(S.activeAlphabetId);
}

/**
 * Activa un abecedario por id. Devuelve true si existe (preset o
 * guardado), false si no.
 */
function setActiveAlphabet(id) {
    const S = getState();
    const alpha = getAlphabetById(id);
    if (!alpha) return false;
    S.activeAlphabetId = id;
    S.customAlphabetChars = sanitizeAlphabetChars(alpha.chars);
    S.currentAlphabet = S.customAlphabetChars.join('');
    saveActiveId();
    saveDraft();
    return true;
}

/**
 * Handler del <select>. La opción 'draft' no se puede "seleccionar"
 * como activa (no es un alfabeto real, es la etiqueta de borrador);
 * si el select quedara en 'draft' sin serlo, se restaura al preset.
 */
function handleAlphabetSelectChange() {
    const S = getState();
    const id = S.dom.alphabetSelect.value;
    if (id === 'draft') return;
    if (!setActiveAlphabet(id)) setActiveAlphabet(S.PRESET_ALPHABETS[0].id);
    renderAlphabetSelect();
    renderAlphabetBuilder();
    updateVerses();
}

/* ==================================================================
   4. CONSTRUCTOR DE ABECEDARIO
   ================================================================== */

/**
 * Pinta los 22 slots del constructor. Cada slot contiene:
 *   - badge de conteo (esquina superior derecha),
 *   - nº de orden (1..22),
 *   - letra paleo original (alphabetData[index].mod),
 *   - letra A-V (A..V),
 *   - input de 1 carácter,
 *   - flechas ◀ ▶ para mover.
 */
function renderAlphabetBuilder() {
    const S = getState();
    S.dom.alphabetBuilder.innerHTML = '';

    for (let index = 0; index < S.customAlphabetChars.length; index++) {
        const char = S.customAlphabetChars[index];
        const slot = document.createElement('div');
        slot.className = 'alpha-slot';
        slot.draggable = true;
        slot.dataset.index = index;

        const badge = document.createElement('span');
        badge.className = 'alpha-count';
        badge.textContent = '0';

        const num = document.createElement('div');
        num.className = 'alpha-num';
        num.textContent = index + 1;

        const orig = document.createElement('div');
        orig.className = 'alpha-original';
        orig.textContent = alphabetData[index].mod;
        orig.title = 'Letra original';

        const latin = document.createElement('div');
        latin.className = 'alpha-latin';
        latin.textContent = String.fromCharCode(65 + index);
        latin.title = 'Letra A-V';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.value = char || '';
        input.draggable = false;
        input.addEventListener('input', handleAlphaInput);

        const buttons = document.createElement('div');
        buttons.className = 'alpha-slot-buttons';

        const leftBtn = document.createElement('button');
        leftBtn.textContent = '◀';
        leftBtn.title = 'Mover a la izquierda';
        leftBtn.disabled = index === 0;
        leftBtn.addEventListener('click', handleSlotLeftClick);

        const rightBtn = document.createElement('button');
        rightBtn.textContent = '▶';
        rightBtn.title = 'Mover a la derecha';
        rightBtn.disabled = index === S.customAlphabetChars.length - 1;
        rightBtn.addEventListener('click', handleSlotRightClick);

        buttons.appendChild(leftBtn);
        buttons.appendChild(rightBtn);

        slot.appendChild(badge);
        slot.appendChild(num);
        slot.appendChild(orig);
        slot.appendChild(latin);
        slot.appendChild(input);
        slot.appendChild(buttons);

        slot.addEventListener('dragstart', handleDragStart);
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('dragend', handleDragEnd);

        S.dom.alphabetBuilder.appendChild(slot);
    }

    updateBuilderColors();
    updateAlphabetCounts();
    updateAlphabetString();
}

/**
 * Colorea cada slot según si su letra está repetida en el alfabeto:
 *   - .alpha-cyan    → letra única,
 *   - .alpha-magenta → letra repetida.
 * Los slots vacíos no llevan ninguna de las dos clases.
 */
function updateBuilderColors() {
    const S = getState();
    const counts = {};
    for (let i = 0; i < S.customAlphabetChars.length; i++) {
        const ch = (S.customAlphabetChars[i] || '').toUpperCase();
        if (!ch) continue;
        counts[ch] = (counts[ch] || 0) + 1;
    }

    const slots = S.dom.alphabetBuilder.querySelectorAll('.alpha-slot');
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const ch = (S.customAlphabetChars[i] || '').toUpperCase();
        slot.classList.remove('alpha-cyan', 'alpha-magenta');
        if (!ch) continue;
        if (counts[ch] > 1) slot.classList.add('alpha-magenta');
        else slot.classList.add('alpha-cyan');
    }
}

/**
 * Cuenta, para cada letra distinta que aparece en las palabras
 * filtradas por regex, cuántas palabras la contienen (una vez por
 * palabra). Devuelve un objeto char → nº de palabras.
 */
function computeLetterWordCounts() {
    const S = getState();
    const counts = {};
    const keys = Object.keys(S.WORD_FREQUENCIES);
    for (let i = 0; i < keys.length; i++) {
        const word = keys[i];
        const display = wordToLetterString(word);
        if (!wordMatchesAnyRegex(display)) continue;
        const seen = new Set();
        for (let j = 0; j < display.length; j++) seen.add(display[j]);
        for (const ch of seen) {
            counts[ch] = (counts[ch] || 0) + 1;
        }
    }
    return counts;
}

/**
 * Pinta el badge de cada slot con el número de palabras filtradas
 * que contienen esa letra. Si el slot está vacío, oculta el badge.
 * Si el conteo es 0, aplica .alpha-count-zero (verde).
 */
function updateAlphabetCounts() {
    const S = getState();
    if (!S.dom.alphabetBuilder) return;
    const counts = computeLetterWordCounts();
    const slots = S.dom.alphabetBuilder.querySelectorAll('.alpha-slot');
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const badge = slot.querySelector('.alpha-count');
        if (!badge) continue;
        const ch = S.customAlphabetChars[i] || '';
        if (!ch) { badge.style.display = 'none'; continue; }
        badge.style.display = '';
        const value = counts[ch] !== undefined ? counts[ch] : 0;
        badge.textContent = value;
        badge.classList.toggle('alpha-count-zero', value === 0);
    }
}

/**
 * Refresca el <code id="alphabet-string"> inferior. Los slots vacíos
 * se muestran como '·' para que el string siga teniendo 22 posiciones.
 */
function updateAlphabetString() {
    const S = getState();
    const el = document.getElementById('alphabet-string');
    if (!el) return;
    const arr = [];
    for (let i = 0; i < S.customAlphabetChars.length; i++) {
        arr.push(S.customAlphabetChars[i] || '·');
    }
    el.textContent = arr.join('');
}

/**
 * Mueve un slot desde `from` hasta `to` (ambos índices 0..21) y
 * re-renderiza el constructor. Usado por las flechas ◀ ▶.
 */
function moveSlot(from, to) {
    const S = getState();
    if (to < 0 || to >= S.customAlphabetChars.length) return;
    const moved = S.customAlphabetChars.splice(from, 1)[0];
    S.customAlphabetChars.splice(to, 0, moved);
    applyCustomAlphabet();
    renderAlphabetBuilder();
}

/**
 * Punto central que aplica el estado actual de customAlphabetChars:
 *   - si el abecedario activo es guardado, lo actualiza in-place,
 *   - si es preset, cambia activeAlphabetId a 'draft',
 *   - guarda el borrador,
 *   - refresca versículos + colores + badges + string + botón borrar.
 */
function applyCustomAlphabet() {
    const S = getState();
    S.currentAlphabet = S.customAlphabetChars.join('');

    if (isSavedAlphabet(S.activeAlphabetId)) {
        let idx = -1;
        for (let i = 0; i < S.savedAlphabets.length; i++) {
            if (S.savedAlphabets[i].id === S.activeAlphabetId) { idx = i; break; }
        }
        if (idx !== -1) {
            S.savedAlphabets[idx].chars = S.customAlphabetChars.slice();
            saveSavedAlphabets();
        }
    } else if (S.activeAlphabetId !== 'draft') {
        S.activeAlphabetId = 'draft';
        saveActiveId();
        renderAlphabetSelect();
    }

    saveDraft();
    updateVerses();
    updateBuilderColors();
    updateAlphabetCounts();
    updateDeleteButtonState();
    updateAlphabetString();
}

/* ==================================================================
   5. INTERACCIÓN CON SLOTS (input, flechas, drag & drop)
   ================================================================== */

function handleAlphaInput(e) {
    const S = getState();
    const index = Number(e.target.parentElement.dataset.index);
    const val = e.target.value.toUpperCase().slice(0, 1);
    e.target.value = val;
    S.customAlphabetChars[index] = val;
    applyCustomAlphabet();
}

function handleSlotLeftClick(e) {
    // input → .alpha-slot-buttons → .alpha-slot
    const index = Number(e.currentTarget.parentElement.parentElement.dataset.index);
    moveSlot(index, index - 1);
}

function handleSlotRightClick(e) {
    const index = Number(e.currentTarget.parentElement.parentElement.dataset.index);
    moveSlot(index, index + 1);
}

function handleDragStart(e) {
    const S = getState();
    S.dragSourceIndex = Number(e.currentTarget.dataset.index);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(S.dragSourceIndex));
}

function handleDragOver(e) {
    const S = getState();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (Number(e.currentTarget.dataset.index) !== S.dragSourceIndex) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    const S = getState();
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const targetIndex = Number(e.currentTarget.dataset.index);
    if (S.dragSourceIndex === null || S.dragSourceIndex === targetIndex) return;

    const moved = S.customAlphabetChars.splice(S.dragSourceIndex, 1)[0];
    // Al soltar "hacia la derecha" hay que compensar el hueco que deja
    // el propio elemento al extraerse.
    const insertAt = S.dragSourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    S.customAlphabetChars.splice(insertAt, 0, moved);
    applyCustomAlphabet();
    renderAlphabetBuilder();
}

function handleDragEnd(e) {
    const S = getState();
    e.currentTarget.classList.remove('dragging');
    const slots = document.querySelectorAll('.alpha-slot');
    for (let i = 0; i < slots.length; i++) {
        slots[i].classList.remove('drag-over');
    }
    S.dragSourceIndex = null;
}

/* ==================================================================
   6. ALTA Y BAJA DE ABECEDARIOS GUARDADOS
   ================================================================== */

function handleModalError() {
    // No-op: el usuario canceló; no hay nada que hacer.
}

function handleAddAlphabetClick() {
    showModal(
        'Guardar abecedario',
        'Introduce un nombre para el nuevo abecedario:',
        true, '', 'Nombre', 'Guardar', 'Cancelar'
    ).then(handleAddAlphabetConfirm).catch(handleModalError);
}

function handleAddAlphabetConfirm(name) {
    const S = getState();
    const trimmed = (name || '').trim();
    if (!trimmed) {
        showToast('El nombre no puede estar vacío.', 'error');
        return;
    }
    const nuevo = {
        id: 'saved:' + Date.now(),
        name: trimmed,
        chars: S.customAlphabetChars.slice()
    };
    S.savedAlphabets.push(nuevo);
    saveSavedAlphabets();
    S.activeAlphabetId = nuevo.id;
    saveActiveId();
    saveDraft();
    renderAlphabetSelect();
    updateDeleteButtonState();
    showToast(`Abecedario "${trimmed}" guardado.`, 'success');
}

function handleDeleteAlphabetClick() {
    const S = getState();
    let idx = -1;
    for (let i = 0; i < S.savedAlphabets.length; i++) {
        if (S.savedAlphabets[i].id === S.activeAlphabetId) { idx = i; break; }
    }
    if (idx === -1) return;
    const alpha = S.savedAlphabets[idx];
    showModal(
        'Eliminar abecedario',
        `¿Eliminar el abecedario "${alpha.name}"?`,
        false, '', '', 'Eliminar', 'Cancelar'
    ).then(handleDeleteAlphabetConfirm).catch(handleModalError);
}

function handleDeleteAlphabetConfirm() {
    const S = getState();
    let idx = -1;
    for (let i = 0; i < S.savedAlphabets.length; i++) {
        if (S.savedAlphabets[i].id === S.activeAlphabetId) { idx = i; break; }
    }
    if (idx !== -1) {
        const alpha = S.savedAlphabets[idx];
        S.savedAlphabets.splice(idx, 1);
        saveSavedAlphabets();
        setActiveAlphabet(S.PRESET_ALPHABETS[0].id);
        renderAlphabetSelect();
        renderAlphabetBuilder();
        updateVerses();
        showToast(`Abecedario "${alpha.name}" eliminado.`, 'info');
    }
}

/* ==================================================================
   7. COPIAR ABECEDARIO AL PORTAPAPELES
   ================================================================== */

function handleCopyAlphabetClick() {
    const S = getState();
    const arr = [];
    for (let i = 0; i < S.customAlphabetChars.length; i++) {
        arr.push(S.customAlphabetChars[i] || '·');
    }
    const text = arr.join('');
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(handleCopyAlphabetSuccess);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            handleCopyAlphabetSuccess();
        }
    } catch (e) {
        showToast('No se pudo copiar al portapapeles.', 'error');
    }
}

function handleCopyAlphabetSuccess() {
    const S = getState();
    S.dom.copyAlphabetBtn.textContent = '✅';
    S.dom.copyAlphabetBtn.classList.add('copied');
    showToast('Abecedario copiado.', 'success', 2000);
    setTimeout(restoreCopyAlphabetBtn, 1200);
}

function restoreCopyAlphabetBtn() {
    const S = getState();
    S.dom.copyAlphabetBtn.textContent = '📋';
    S.dom.copyAlphabetBtn.classList.remove('copied');
}

/* ==================================================================
   8. CONTEO DE PALABRAS PARA UN ALFABETO DADO
   ==================================================================
   Se usan desde random-alphabet.js, pero viven aquí porque son
   lógica de "alfabeto", no de búsqueda aleatoria.
   ================================================================== */

/**
 * Devuelve la representación en letras del alfabeto dado (array de
 * 22 caracteres) para una palabra paleo. Es igual que
 * wordToLetterString() pero permitiendo un alfabeto distinto del
 * activo (necesario para evaluar candidatos durante la búsqueda
 * aleatoria).
 */
function wordDisplayWith(word, alphabetChars) {
    const S = getState();
    const rev = word.split('').reverse();
    let s = '';
    for (let i = 0; i < rev.length; i++) {
        const idx = S.LETTER_INDEX[rev[i]];
        if (idx) s += alphabetChars[idx - 1] || 'X';
    }
    return s;
}

/**
 * Devuelve cuántas palabras distintas del corpus matchean al menos
 * una regex activa cuando se codifican con `alphabetChars`.
 */
function countMatchingWordsForAlphabet(alphabetChars) {
    let count = 0;
    const S = getState();
    const keys = Object.keys(S.WORD_FREQUENCIES);
    for (let i = 0; i < keys.length; i++) {
        const display = wordDisplayWith(keys[i], alphabetChars);
        if (wordMatchesAnyRegex(display)) count++;
    }
    return count;
}
