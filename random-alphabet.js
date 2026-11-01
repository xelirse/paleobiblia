/* ==================================================================
   GENERACIÓN ALEATORIA DE ABECEDARIOS
   ==================================================================
   Este archivo contiene exclusivamente la lógica del botón 🎲:

     1. Muestreo ponderado SIN reemplazo (weightedSampleUnique).
     2. Búsqueda iterativa con límite de tiempo y notificación de
        progreso en el propio botón (searchRandomAlphabet).
     3. Utilidades para ceder el hilo (emptyPromiseExecutor/doResolve).
     4. Orquestación de dos fases con pools crecientes
        (generateRandomAlphabet).
     5. Handler del botón y aplicación del resultado
        (handleRandomAlphabetClick).

   Estrategia:
     - Fase 1: muestrea 22 caracteres del pool BASE.
     - Fase 2: muestrea 22 caracteres del pool BASE + EXTRA.
     - Se queda con la mejor de las dos (menos coincidencias).
     - Si en cualquier fase aparece un alfabeto con 0 coincidencias,
       termina inmediatamente.

   Dependencias en runtime:
     - state.js    (getState, RANDOM_ALPHABET_BASE/EXTRA)
     - utils.js    (formatDuration, formatDateTime)
     - ui.js       (showToast)
     - alphabet.js (sanitizeAlphabetChars, countMatchingWordsForAlphabet,
                    saveActiveId, saveDraft, renderAlphabetSelect,
                    renderAlphabetBuilder)
     - events.js   (updateVerses)

   Se carga después de alphabet.js y antes de events.js/main.js.
   ================================================================== */

/* ------------------------------------------------------------------
   DURACIÓN DE CADA FASE DE BÚSQUEDA
   ------------------------------------------------------------------
   Valor original: 60000000 ms ≈ 16.7 h por fase (≈ 33.3 h total).
   Si te parece excesivo, ajústalo aquí; p. ej.:
     60000   = 1 minuto
     600000  = 10 minutos
   La búsqueda igualmente hace early-return en cuanto encuentra un
   alfabeto con 0 coincidencias, así que este valor es solo un techo
   de seguridad.
   ------------------------------------------------------------------ */
const RANDOM_ALPHABET_PHASE_DURATION_MS = 60000000;

/* ==================================================================
   1. MUESTREO PONDERADO SIN REEMPLAZO
   ==================================================================
   Dado un pool [{ ch, w }, …] y una cantidad `count`, elige `count`
   caracteres distintos sin reemplazo, con probabilidad proporcional
   a su peso `w`. Si el pool tiene menos de `count` elementos,
   completa con 'X' hasta llegar a `count`.
   ================================================================== */
function weightedSampleUnique(pool, count) {
    // Copia de trabajo: no mutamos el pool original.
    const remaining = [];
    for (let i = 0; i < pool.length; i++) {
        remaining.push({ ch: pool[i].ch, w: pool[i].w });
    }

    const result = [];
    while (result.length < count && remaining.length > 0) {
        let total = 0;
        for (let i = 0; i < remaining.length; i++) total += remaining[i].w;

        let r = Math.random() * total;
        let idx = 0;
        for (let i = 0; i < remaining.length; i++) {
            r -= remaining[i].w;
            if (r <= 0) { idx = i; break; }
        }

        result.push(remaining[idx].ch);
        remaining.splice(idx, 1);
    }

    // Relleno defensivo (no debería ocurrir con los pools actuales).
    while (result.length < count) result.push('X');
    return result;
}

/* ==================================================================
   2. BÚSQUEDA ITERATIVA CON LÍMITE DE TIEMPO
   ==================================================================
   Genera alfabetos aleatorios del pool hasta que:
     - se acaba el tiempo (durationMs), o
     - aparece un alfabeto con 0 coincidencias (early-return).

   Devuelve { alphabet, matches, iterations } con:
     - alphabet:   el mejor alfabeto encontrado (menos coincidencias),
     - matches:    nº de coincidencias de ese alfabeto,
     - iterations: nº total de muestras evaluadas.

   Durante la búsqueda se actualiza el texto y el tooltip del botón 🎲
   con el progreso. Es un acoplamiento deliberado (la UI del botón es
   el indicador de progreso de esta operación), pero conviene tenerlo
   presente: searchRandomAlphabet() modifica el DOM del botón.
   ================================================================== */
async function searchRandomAlphabet(pool, durationMs, phaseLabel, startTime, endTime) {
    const S = getState();
    const deadline = Date.now() + durationMs;

    let best = null;
    let bestCount = Infinity;
    let iterations = 0;

    while (Date.now() < deadline) {
        // Evaluamos en tandas de 400 para no consultar el reloj en
        // cada iteración.
        for (let i = 0; i < 400; i++) {
            const alpha = weightedSampleUnique(pool, 22);
            const c = countMatchingWordsForAlphabet(alpha);
            iterations++;

            if (c === 0) return { alphabet: alpha, matches: 0, iterations };
            if (c < bestCount) { bestCount = c; best = alpha; }

            if (Date.now() >= deadline) break;
        }

        // Actualizamos el botón con el progreso.
        const now = Date.now();
        const elapsed = now - startTime;
        S.dom.randomAlphabetBtn.textContent = `🎲 ${phaseLabel} | ⏱️ ${formatDuration(elapsed)}`;
        S.dom.randomAlphabetBtn.title =
            `Fase ${phaseLabel}\n` +
            `Transcurrido: ${formatDuration(elapsed)}\n` +
            `Fin estimado: ${formatDateTime(endTime)}\n` +
            `Iteraciones: ${iterations}`;

        // Cedemos el hilo para que el navegador repinte y siga vivo.
        await new Promise(emptyPromiseExecutor);
    }

    return { alphabet: best, matches: bestCount, iterations };
}

/**
 * Cede el hilo mediante un setTimeout(…, 0). El `resolve` se guarda
 * en el estado global porque el ejecutor de Promise no tiene acceso
 * a un cierre que sobreviva al ciclo actual; doResolve() lo invoca
 * en el siguiente macrotask.
 *
 * Equivalente más idiomático:
 *     await new Promise(r => setTimeout(r, 0));
 * pero se conserva este mecanismo para no alterar el comportamiento
 * original.
 */
function emptyPromiseExecutor(resolve) {
    const S = getState();
    S.pendingResolve = resolve;
    setTimeout(doResolve, 0);
}

function doResolve() {
    const S = getState();
    if (S.pendingResolve) {
        S.pendingResolve();
        S.pendingResolve = null;
    }
}

/* ==================================================================
   3. ORQUESTACIÓN DE LAS DOS FASES
   ==================================================================
   - Fase 1 usa RANDOM_ALPHABET_BASE.
   - Fase 2 usa RANDOM_ALPHABET_BASE + RANDOM_ALPHABET_EXTRA.
   - Si cualquiera de las dos encuentra 0 coincidencias, se devuelve
     ese resultado de inmediato.
   - En caso contrario, se devuelve la mejor de las dos (menos
     coincidencias).
   ================================================================== */
async function generateRandomAlphabet() {
    const S = getState();
    const poolBase = S.RANDOM_ALPHABET_BASE.slice();
    const poolExtended = S.RANDOM_ALPHABET_BASE.concat(S.RANDOM_ALPHABET_EXTRA);

    const duration1 = RANDOM_ALPHABET_PHASE_DURATION_MS;
    const duration2 = RANDOM_ALPHABET_PHASE_DURATION_MS;

    const startTime = Date.now();
    const endTime1 = startTime + duration1;
    const endTime2 = endTime1 + duration2;

    const r1 = await searchRandomAlphabet(poolBase, duration1, '1/2', startTime, endTime1);
    if (r1.matches === 0) return r1;

    const r2 = await searchRandomAlphabet(poolExtended, duration2, '2/2', endTime1, endTime2);
    if (r2.matches === 0) return r2;

    return r1.matches <= r2.matches ? r1 : r2;
}

/* ==================================================================
   4. HANDLER DEL BOTÓN 🎲
   ==================================================================
   - Bloquea el botón mientras dura la búsqueda.
   - Aplica el alfabeto encontrado como borrador ('draft').
   - Restaura el texto y el tooltip del botón en `finally`, incluso
     si hay excepciones.
   ================================================================== */
async function handleRandomAlphabetClick() {
    const S = getState();
    if (S.dom.randomAlphabetBtn.disabled) return;

    S.dom.randomAlphabetBtn.disabled = true;
    const originalText = S.dom.randomAlphabetBtn.textContent;
    const originalTitle = S.dom.randomAlphabetBtn.title;

    showToast('Buscando abecedario… (fase 1/2)', 'info', 4000);

    try {
        const result = await generateRandomAlphabet();

        S.customAlphabetChars = sanitizeAlphabetChars(result.alphabet);
        S.currentAlphabet = S.customAlphabetChars.join('');
        S.activeAlphabetId = 'draft';
        saveActiveId();
        saveDraft();
        renderAlphabetSelect();
        renderAlphabetBuilder();
        updateVerses();

        if (result.matches === 0) {
            showToast('✅ Abecedario encontrado: ninguna palabra coincide.', 'success', 6000);
        } else {
            showToast(`⚠️ Mejor resultado: ${result.matches} palabra(s) coincidente(s).`, 'warning', 6000);
        }
    } finally {
        S.dom.randomAlphabetBtn.disabled = false;
        S.dom.randomAlphabetBtn.textContent = originalText;
        S.dom.randomAlphabetBtn.title = originalTitle;
    }
}
