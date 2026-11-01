/* ==================================================================
   TABLAS DE FRECUENCIAS (caracteres y palabras)
   ==================================================================
   Este archivo contiene exclusivamente el render y la lógica de
   ordenación de las dos tablas de frecuencias:

     1. Tabla de frecuencias de CARACTERES (letra/índice → nº de usos).
     2. Tabla de frecuencias de PALABRAS:
          - "todas las palabras" (word-frequency-table),
          - "palabras coincidentes" filtradas por regex
            (filtered-word-frequency-table).
     3. Helpers de resaltado A-V con colores para letras repetidas.

   Dependencias en runtime:
     - state.js  (getState)
     - utils.js  (idxToLetter, wordToLetterString, wordToAVString,
                  escapeHtml)
     - regex.js  (wordMatchesAnyRegex, highlightWord)

   Como todas son declaraciones de función (hoisted), el orden de
   carga no importa mientras este archivo se cargue después de
   state.js y antes de cualquier llamada en runtime.
   ================================================================== */

/* ==================================================================
   1. TABLA DE FRECUENCIAS DE CARACTERES
   ==================================================================
   Ordena por frecuencia descendente y, a igual frecuencia, por índice
   ascendente de letra. Cada fila muestra:

     - Carácter:   la letra actual del alfabeto (o el índice 1..22).
     - A-V:        la letra A..V correspondiente (siempre A..V).
     - Frecuencia: nº de apariciones en todos los versículos.

   La celda A-V se colorea con .av-cyan si la letra aparece en la
   columna Carácter con el modo actual, y .av-magenta en caso
   contrario. (Esto indica "presente/ausente", no "única/repetida";
   para la semántica única/repetida ver updateBuilderColors() en
   alphabet.js y highlightAVWord() más abajo.)
   ================================================================== */
function compareFreqEntries(a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.idx - b.idx;
}

function renderFrequencyTable(showLetters) {
    const S = getState();
    const table = document.getElementById('frequency-table');
    table.innerHTML = '';

    const entries = [];
    const keys = Object.keys(S.FREQUENCIES);
    for (let i = 0; i < keys.length; i++) {
        entries.push({ idx: Number(keys[i]), count: S.FREQUENCIES[keys[i]] });
    }
    entries.sort(compareFreqEntries);

    // Conjunto de valores que aparecen en la columna "Carácter" con el
    // modo actual (letras si showLetters, índices si no). Se usa para
    // marcar la columna A-V como presente/ausente.
    const charColumnSet = new Set();
    for (let i = 0; i < entries.length; i++) {
        const idx = entries[i].idx;
        charColumnSet.add(showLetters ? idxToLetter(idx) : String(idx));
    }

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Carácter', 'A-V', 'Frecuencia'];
    for (let i = 0; i < headers.length; i++) {
        const th = document.createElement('th');
        th.textContent = headers[i];
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const tr = document.createElement('tr');

        // Columna 1: letra actual o índice.
        const tdChar = document.createElement('td');
        tdChar.textContent = showLetters ? idxToLetter(entry.idx) : entry.idx;

        // Columna 2: letra A-V (siempre A..V, independiente del alfabeto).
        const avLetter = String.fromCharCode(64 + entry.idx);
        const tdAV = document.createElement('td');
        tdAV.className = 'av-cell';
        const span = document.createElement('span');
        span.className = 'av-highlight ' + (charColumnSet.has(avLetter) ? 'av-cyan' : 'av-magenta');
        span.textContent = avLetter;
        tdAV.appendChild(span);

        // Columna 3: frecuencia.
        const tdCount = document.createElement('td');
        tdCount.textContent = entry.count;

        tr.appendChild(tdChar);
        tr.appendChild(tdAV);
        tr.appendChild(tdCount);
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
}

/* ==================================================================
   2. RESALTADO A-V CON COLORES PARA LETRAS REPETIDAS
   ==================================================================
   Dada una cadena A-V (p. ej. "ABAC"), devuelve HTML donde:
     - cada letra que aparece MÁS DE UNA VEZ en la cadena recibe una
       clase av-letter-color-N (0..7) estable por letra dentro de la
       misma palabra (misma letra → mismo color),
     - cada letra que aparece UNA SOLA VEZ recibe av-letter-cyan.

   El ciclo de 8 colores está definido en styles.css
   (.av-letter-color-0 … .av-letter-color-7).
   ================================================================== */
function highlightAVWord(avText) {
    if (!avText) return '';

    // Conteo de apariciones por carácter dentro de esta palabra.
    const counts = {};
    for (let i = 0; i < avText.length; i++) {
        counts[avText[i]] = (counts[avText[i]] || 0) + 1;
    }

    // Asigna un color estable (0..7) a cada letra repetida, en orden
    // de primera aparición.
    const repeatedColorMap = {};
    let nextColor = 0;
    for (let i = 0; i < avText.length; i++) {
        const ch = avText[i];
        if (counts[ch] > 1 && !(ch in repeatedColorMap)) {
            repeatedColorMap[ch] = nextColor % 8;
            nextColor++;
        }
    }

    let html = '';
    for (let i = 0; i < avText.length; i++) {
        const ch = avText[i];
        if (counts[ch] > 1) {
            const c = repeatedColorMap[ch];
            html += `<span class="av-letter av-letter-color-${c}">${escapeHtml(ch)}</span>`;
        } else {
            html += `<span class="av-letter av-letter-cyan">${escapeHtml(ch)}</span>`;
        }
    }
    return html;
}

/* ==================================================================
   3. ORDENACIÓN DE PALABRAS
   ==================================================================
   Dos modos:
     - Por longitud (desc) y, a igual longitud, por frecuencia (desc).
     - Por frecuencia (desc) y, a igual frecuencia, alfabéticamente
       por la representación en letras del alfabeto actual.
   ================================================================== */
function compareWordsLength(a, b) {
    if (b.length !== a.length) return b.length - a.length;
    return b.count - a.count;
}

function compareWordsFreq(a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.display.localeCompare(b.display);
}

function getSortedWordEntries(sortByLength) {
    const S = getState();
    const result = [];
    const keys = Object.keys(S.WORD_FREQUENCIES);
    for (let i = 0; i < keys.length; i++) {
        const word = keys[i];
        const count = S.WORD_FREQUENCIES[word];
        result.push({
            word: word,
            count: count,
            length: word.length,
            display: wordToLetterString(word),
            av: wordToAVString(word)
        });
    }
    if (sortByLength) {
        result.sort(compareWordsLength);
    } else {
        result.sort(compareWordsFreq);
    }
    return result;
}

/* ==================================================================
   4. RENDER GENÉRICO DE UNA TABLA DE PALABRAS
   ==================================================================
   Construye el thead/tbody de `table` a partir de `entries` (ya
   ordenadas). Si showAV, añade la columna A-V con highlightAVWord();
   si no, solo Palabra + Frecuencia. La columna Palabra usa
   highlightWord() para marcar coincidencias de regex en rojo/verde.
   ================================================================== */
function fillWordTable(table, entries, showAV) {
    table.innerHTML = '';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = showAV ? ['Palabra', 'A-V', 'Frecuencia'] : ['Palabra', 'Frecuencia'];
    for (let i = 0; i < headers.length; i++) {
        const th = document.createElement('th');
        th.textContent = headers[i];
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    if (entries.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = showAV ? 3 : 2;
        td.style.cssText = 'text-align:center;color:#bdc3c7;font-style:italic;';
        td.textContent = 'Sin coincidencias';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const tr = document.createElement('tr');

            const tdWord = document.createElement('td');
            tdWord.innerHTML = highlightWord(entry.display);
            tr.appendChild(tdWord);

            if (showAV) {
                const tdAV = document.createElement('td');
                tdAV.className = 'av-cell';
                tdAV.innerHTML = highlightAVWord(entry.av);
                tr.appendChild(tdAV);
            }

            const tdCount = document.createElement('td');
            tdCount.textContent = entry.count;
            tr.appendChild(tdCount);

            tbody.appendChild(tr);
        }
    }
    table.appendChild(tbody);
}

/* ==================================================================
   5. RENDER DE LAS DOS TABLAS DE PALABRAS
   ==================================================================
   - renderWordFrequencyTable:         todas las palabras.
   - renderFilteredWordFrequencyTable: solo las que matchean al menos
                                       una regex activa.
   ================================================================== */
function renderWordFrequencyTable(sortByLength) {
    const table = document.getElementById('word-frequency-table');
    fillWordTable(table, getSortedWordEntries(sortByLength), true);
}

function renderFilteredWordFrequencyTable(sortByLength) {
    const table = document.getElementById('filtered-word-frequency-table');
    const allEntries = getSortedWordEntries(sortByLength);
    const filtered = [];
    for (let i = 0; i < allEntries.length; i++) {
        if (wordMatchesAnyRegex(allEntries[i].display)) {
            filtered.push(allEntries[i]);
        }
    }
    fillWordTable(table, filtered, true);
}
