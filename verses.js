/* ==================================================================
   VERSÍCULOS Y DIBUJO DE LETRAS EN CANVAS
   ==================================================================
   Este archivo contiene exclusivamente:

     1. drawLetter(ctx, ch, x, y, scale): pinta UNA letra paleohebrea
        sobre un canvas ya preparado, escalándola al tamaño de celda.

     2. getVerseIndicesTextByMode(verse, isRtl, mode): genera el texto
        de índices de un versículo en uno de cuatro modos:
          - 'number' → 1..22
          - 'letter' → letra actual del alfabeto personalizado
          - 'av'     → A..V
          - 'hebrew' → א..ת

     3. buildVerseCanvas(verse, showLetters): construye un <canvas>
        con las líneas del versículo dibujadas (letras paleo +,
        opcionalmente, el índice/letra bajo cada trazo).

     4. buildAlphabetGrid(): pinta las 22 tarjetas del alfabeto
        paleohebreo (canvas + forma moderna + nombre + detalles).

     5. buildVerses(): crea los <details> de los 32 versículos con
        su canvas y sus tres bloques de índices (auto/A-V/hebreo), y
        registra las referencias en S.verseRefs para que updateVerses()
        pueda re-renderizarlos.

   Dependencias:
     - state.js (getState: LETTER_INDEX, LETTERS ya NO, alphabetData
                ya NO, CELL, WORD_GAP, DASH_W, ROW_H, PAD, W,
                CONTENT_W, SCALE, HEBREW_LETTERS, VERSES)
     - draw.js  (const LETTERS, const alphabetData)
     - utils.js (idxToLetter, lineWidth)

   Se carga después de draw.js y utils.js, y antes de events.js
   (updateVerses depende de S.verseRefs, que se rellena aquí).

   NOTA sobre el primer render:
   buildVerses() se ejecuta en programa() ANTES de loadCheckboxStates(),
   así que los canvas y los índices se crean con los valores por
   defecto (LTR, sin letras). Para que respeten las preferencias
   guardadas, main.js DEBE llamar a updateVerses() después de
   loadCheckboxStates(). Ese es el fix del bug de "canvas e índices
   inconsistentes con los checkboxes al recargar".
   ================================================================== */

/* ------------------------------------------------------------------
   1. DIBUJO DE UNA LETRA SOBRE UN CONTEXTO 2D
   ------------------------------------------------------------------
   El canvas de cada letra está normalizado a 100×100; aquí se
   traslada y escala para que ocupe `CELL * scale` píxeles.
   ------------------------------------------------------------------ */
function drawLetter(ctx, ch, x, y, scale) {
    const S = getState();
    const L = LETTERS[ch];         // LETTERS vive en draw.js
    if (!L) return;
    const size = S.CELL * scale;
    ctx.save();
    ctx.translate(x, y - size / 2);
    ctx.scale(size / 100, size / 100);
    ctx.lineWidth = 7;
    ctx.beginPath();
    L.draw(ctx);
    ctx.stroke();
    ctx.restore();
}

/* ------------------------------------------------------------------
   2. TEXTO DE ÍNDICES DE UN VERSÍCULO
   ------------------------------------------------------------------
   Recorre las líneas y, dentro de cada línea, los tokens. Los
   tokens '-' se omiten. Para cada carácter paleo se busca su índice
   en LETTER_INDEX y se emite:

     mode = 'number' → 1..22
     mode = 'letter' → letra actual del alfabeto personalizado
     mode = 'av'     → A..V
     mode = 'hebrew' → א..ת

   Si isRtl === true, se invierte el orden de líneas, de palabras y
   de caracteres para simular lectura hebrea (derecha → izquierda).

   El separador entre palabras es ' ' (o ' - ' en modo numérico) y
   el separador entre caracteres es '' (o ' ' en modo numérico),
   para que el texto resultante sea legible.
   ------------------------------------------------------------------ */
function getVerseIndicesTextByMode(verse, isRtl, mode) {
    const S = getState();
    const lines = [];

    for (let i = 0; i < verse.lines.length; i++) {
        const tokens = verse.lines[i];
        const orderedTokens = isRtl ? tokens : tokens.slice().reverse();
        const words = [];

        for (let j = 0; j < orderedTokens.length; j++) {
            const tk = orderedTokens[j];
            if (tk === '-') continue;

            const chars = isRtl ? tk.split('') : tk.split('').reverse();
            const items = [];

            for (let k = 0; k < chars.length; k++) {
                const ch = chars[k];
                const idx = S.LETTER_INDEX[ch];
                if (!idx) continue;

                let out;
                if (mode === 'number')      out = idx;
                else if (mode === 'letter') out = idxToLetter(idx);
                else if (mode === 'av')     out = String.fromCharCode(64 + idx);
                else if (mode === 'hebrew') out = S.HEBREW_LETTERS[idx - 1];

                items.push(out);
            }

            if (items.length) {
                const innerSep = (mode === 'number') ? ' ' : '';
                words.push(items.join(innerSep));
            }
        }

        const wordSep = (mode === 'number') ? ' - ' : ' ';
        lines.push(words.join(wordSep));
    }

    return lines.join('\n');
}

/* ------------------------------------------------------------------
   3. CANVAS DE UN VERSÍCULO
   ------------------------------------------------------------------
   Cada línea se dibuja de abajo hacia arriba (la primera línea del
   versículo va abajo, como en hebreo) y de derecha a izquierda
   (por eso `x = W - PAD - totalW` y luego avanza hacia la derecha).

   Si showLetters es true, bajo cada trazo se pinta el índice o la
   letra actual en gris (#7a869a); si es false, se pinta el índice
   numérico 1..22.

   Devuelve el <canvas> (sin insertarlo aún en el DOM).
   ------------------------------------------------------------------ */
function buildVerseCanvas(verse, showLetters) {
    const S = getState();
    const rows = verse.lines.length;
    const H = rows * S.ROW_H + S.PAD * 2;

    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = S.W * dpr;
    canvas.height = H * dpr;
    canvas.className = 'verse-canvas';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.font = `bold ${14 * S.SCALE}px ui-monospace, 'SF Mono', Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < verse.lines.length; i++) {
        const tokens = verse.lines[i];
        const y = S.PAD + i * S.ROW_H + S.ROW_H / 2;
        const totalW = lineWidth(tokens) * S.SCALE;
        let x = S.W - S.PAD - totalW;

        for (let j = 0; j < tokens.length; j++) {
            const tk = tokens[j];
            const last = j === tokens.length - 1;

            if (tk === '-') {
                x += S.DASH_W * S.SCALE;
            } else {
                for (let k = 0; k < tk.length; k++) {
                    const ch = tk[k];
                    drawLetter(ctx, ch, x, y, S.SCALE);

                    const idx = S.LETTER_INDEX[ch];
                    if (idx) {
                        ctx.fillStyle = '#7a869a';
                        const textToDraw = showLetters ? idxToLetter(idx) : idx;
                        ctx.fillText(
                            textToDraw,
                            x + (S.CELL * S.SCALE) / 2,
                            y + (S.CELL * S.SCALE) / 2 + 8
                        );
                        ctx.strokeStyle = '#2c3e50';
                    }

                    x += S.CELL * S.SCALE;
                }
            }

            if (!last) x += S.WORD_GAP * S.SCALE;
        }
    }

    return canvas;
}

/* ------------------------------------------------------------------
   4. GRID DEL ALFABETO PALEOHEBREO
   ------------------------------------------------------------------
   Pinta las 22 tarjetas del <details id="alphabet-details">. Cada
   tarjeta muestra:

     - canvas 100×100 con la letra dibujada,
     - forma moderna (aleph, bet, …),
     - nombre con transliteración,
     - pronunciación y transliteración.
   ------------------------------------------------------------------ */
function buildAlphabetGrid() {
    const S = getState();

    for (let i = 0; i < alphabetData.length; i++) {   // alphabetData vive en draw.js
        const letter = alphabetData[i];

        const card = document.createElement('div');
        card.className = 'card';

        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        letter.draw(ctx);
        ctx.stroke();

        const modDiv = document.createElement('div');
        modDiv.className = 'modern';
        modDiv.textContent = letter.mod;

        const nameDiv = document.createElement('div');
        nameDiv.className = 'name';
        nameDiv.textContent = letter.name;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details';
        detailsDiv.innerHTML =
            `<strong>Pronunciación:</strong> ${letter.pron}<br>` +
            `<strong>Transliteración:</strong> ${letter.trans}`;

        card.appendChild(canvas);
        card.appendChild(modDiv);
        card.appendChild(nameDiv);
        card.appendChild(detailsDiv);

        S.dom.grid.appendChild(card);
    }
}

/* ------------------------------------------------------------------
   5. CONSTRUCCIÓN DE LOS VERSÍCULOS
   ------------------------------------------------------------------
   Por cada versículo se crea un <details> con:

     - <summary>Versículo N</summary>,
     - <div class="verse-canvas-container"> con el canvas inicial,
     - <div class="indices-wrapper"> con tres bloques de índices:
         * auto  (número o letra, según checkbox “Usar letras”),
         * A-V,
         * hebreo.

   Cada bloque queda registrado en S.verseRefs para que
   updateVerses() pueda refrescar su contenido cuando cambien los
   checkboxes o el alfabeto activo.
   ------------------------------------------------------------------ */
function buildVerses() {
    const S = getState();

    for (let i = 0; i < S.VERSES.length; i++) {
        const verse = S.VERSES[i];

        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Versículo ' + verse.n;

        const contentBox = document.createElement('div');
        contentBox.className = 'content-box';

        /* --- Canvas --- */
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'verse-canvas-container';
        const canvas = buildVerseCanvas(verse, false);
        canvasWrapper.appendChild(canvas);

        /* --- Bloques de índices --- */
        const indicesWrapper = document.createElement('div');
        indicesWrapper.className = 'indices-wrapper';

        const mainLabel = document.createElement('div');
        mainLabel.className = 'indices-label';
        mainLabel.textContent = 'Secuencia de caracteres (lectura inferior)';

        const blocksEl = document.createElement('div');
        blocksEl.className = 'indices-blocks';

        const defs = [
            { mode: 'auto',   initialLabel: 'Números' },
            { mode: 'av',     initialLabel: 'A-V'     },
            { mode: 'hebrew', initialLabel: 'Hebreo'  }
        ];
        const refs = [];

        for (let j = 0; j < defs.length; j++) {
            const def = defs[j];

            const block = document.createElement('div');
            block.className = 'indices-block';

            const subLabel = document.createElement('div');
            subLabel.className = 'indices-sublabel';
            subLabel.textContent = def.initialLabel;

            const codeEl = document.createElement('code');
            codeEl.className = 'verse-indices';
            const initialMode = (def.mode === 'auto') ? 'number' : def.mode;
            codeEl.textContent = getVerseIndicesTextByMode(verse, false, initialMode);

            block.appendChild(subLabel);
            block.appendChild(codeEl);
            blocksEl.appendChild(block);

            refs.push({ codeEl: codeEl, mode: def.mode, labelEl: subLabel });
        }

        S.verseRefs.push({ refs: refs, canvasWrapper: canvasWrapper, verse: verse });

        indicesWrapper.appendChild(mainLabel);
        indicesWrapper.appendChild(blocksEl);

        contentBox.appendChild(canvasWrapper);
        contentBox.appendChild(indicesWrapper);

        details.appendChild(summary);
        details.appendChild(contentBox);

        S.dom.versesContainer.appendChild(details);
    }
}
