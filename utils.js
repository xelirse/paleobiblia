/* ==================================================================
   FUNCIONES DE UTILIDAD
   ==================================================================
   Este archivo contiene utilidades puras o casi puras que no dependen
   del DOM ni de otros módulos de UI:

     1. Codificación paleo → base22.
     2. Acceso a la letra actual del alfabeto personalizado.
     3. Conversión de palabra paleo → string de letras / string A-V.
     4. Escape de HTML para inserción segura con innerHTML.
     5. Cálculo de ancho de línea (para canvas y layout).
     6. Formato de duración y de fecha/hora.
     7. Cálculo de frecuencias de caracteres y de palabras.

   Se carga después de state.js y draw.js, y antes de verses.js,
   frequency-tables.js y events.js (que la usan).
   ================================================================== */

/* ------------------------------------------------------------------
   1. CODIFICACIÓN PALEO → BASE22
   ------------------------------------------------------------------ */
function encodeToBase22(word) {
    const S = getState();
    let result = '';
    for (let i = 0; i < word.length; i++) {
        const c = word[i];
        const idx = S.PALEO_CHARS.indexOf(c);
        result += (idx !== -1 ? S.BASE22_CHARS[idx] : c);
    }
    return result;
}

/* ------------------------------------------------------------------
   2. ACCESO A LA LETRA ACTUAL DEL ALFABETO PERSONALIZADO
   ------------------------------------------------------------------ */
function idxToLetter(idx) {
    const S = getState();
    const c = S.customAlphabetChars[idx - 1];
    return (c !== undefined && c !== '') ? c : 'X';
}

/* ------------------------------------------------------------------
   3. CONVERSIÓN DE PALABRA PALEO → LETRAS / A-V
   ------------------------------------------------------------------
   La palabra paleo se lee de izquierda a derecha pero se escribe de
   derecha a izquierda, por eso se invierte antes de mapear.
   ------------------------------------------------------------------ */
function wordToLetterString(word) {
    const S = getState();
    const chars = word.split('').reverse();
    let letters = '';
    for (let i = 0; i < chars.length; i++) {
        const idx = S.LETTER_INDEX[chars[i]];
        if (idx) letters += idxToLetter(idx);
    }
    return letters;
}

function wordToAVString(word) {
    const S = getState();
    const chars = word.split('').reverse();
    let letters = '';
    for (let i = 0; i < chars.length; i++) {
        const idx = S.LETTER_INDEX[chars[i]];
        if (idx) letters += String.fromCharCode(64 + idx);
    }
    return letters;
}

/* ------------------------------------------------------------------
   4. ESCAPE DE HTML
   ------------------------------------------------------------------ */
function escapeHtmlReplacer(c) {
    switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default:  return c;
    }
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, escapeHtmlReplacer);
}

/* ------------------------------------------------------------------
   5. CÁLCULO DE ANCHO DE LÍNEA
   ------------------------------------------------------------------
   Suma el ancho de todos los tokens de una línea más los separadores
   entre palabras. Un token '-' se cuenta como guion (DASH_W).
   ------------------------------------------------------------------ */
function lineWidth(tokens) {
    const S = getState();
    let w = 0;
    for (let i = 0; i < tokens.length; i++) {
        const tk = tokens[i];
        w += (tk === '-' ? S.DASH_W : tk.length * S.CELL);
        if (i < tokens.length - 1) w += S.WORD_GAP;
    }
    return w;
}

/* ------------------------------------------------------------------
   6. FORMATO DE DURACIÓN Y FECHA/HORA
   ------------------------------------------------------------------ */
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function padTwo(n) {
    return String(n).padStart(2, '0');
}

function formatDateTime(timestamp) {
    const d = new Date(timestamp);
    return `${padTwo(d.getDate())}/${padTwo(d.getMonth() + 1)}/${d.getFullYear()} ` +
           `${padTwo(d.getHours())}:${padTwo(d.getMinutes())}:${padTwo(d.getSeconds())}`;
}

/* ------------------------------------------------------------------
   7. FRECUENCIAS
   ------------------------------------------------------------------
   Se calculan una sola vez al iniciar (programa()) y luego solo se
   recalculan si cambia el alfabeto o las regex. Devuelven objetos
   indexados por:
     - computeFrequencies:      índice de letra 1..22 → nº de apariciones.
     - computeWordFrequencies:  palabra paleo     → nº de apariciones.
   ------------------------------------------------------------------ */
function computeFrequencies() {
    const S = getState();
    const counts = {};
    for (let i = 0; i < S.VERSES.length; i++) {
        for (let j = 0; j < S.VERSES[i].lines.length; j++) {
            const tokens = S.VERSES[i].lines[j];
            for (let k = 0; k < tokens.length; k++) {
                const tk = tokens[k];
                if (tk === '-') continue;
                for (let m = 0; m < tk.length; m++) {
                    const idx = S.LETTER_INDEX[tk[m]];
                    if (idx) counts[idx] = (counts[idx] || 0) + 1;
                }
            }
        }
    }
    return counts;
}

function computeWordFrequencies() {
    const S = getState();
    const counts = {};
    for (let i = 0; i < S.VERSES.length; i++) {
        for (let j = 0; j < S.VERSES[i].lines.length; j++) {
            const tokens = S.VERSES[i].lines[j];
            for (let k = 0; k < tokens.length; k++) {
                const tk = tokens[k];
                if (tk === '-') continue;
                counts[tk] = (counts[tk] || 0) + 1;
            }
        }
    }
    return counts;
}
