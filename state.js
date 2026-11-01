/* ==================================================================
   ESTADO Y CONSTANTES (Sin variables globales)
   ==================================================================
   Nota: los datos de las letras (alphabetData y LETTERS) viven en
   draw.js junto con las funciones drawXxx. Este archivo solo
   contiene el estado mutable, las constantes numéricas, las claves
   de localStorage y los datos "de contenido" (versículos, alfabetos
   aleatorios, presets).

   Campos añadidos para el panel de expresiones en pestañas:
     - activeRegexTab: pestaña activa ('none' | 'start' | 'end' | 'both').
     - regexRTL:       modo de orden de derecha a izquierda (solo
                       afecta a la pestaña 'end').
   ================================================================== */
function getState() {
    if (!getState._state) {
        getState._state = {
            /* ---------- Índice y alfabetos de codificación ---------- */
            LETTER_INDEX: {
                a: 1,  b: 2,  g: 3,  d: 4,  e: 5,  v: 6,  z: 7,  h: 8,
                t: 9,  i: 10, k: 11, l: 12, m: 13, n: 14, s: 15, o: 16,
                p: 17, c: 18, q: 19, r: 20, w: 21, T: 22
            },
            PALEO_CHARS: "abgdevzhtiklmnsopcqrwT",
            BASE22_CHARS: "0123456789abcdefghijkl",
            HEBREW_LETTERS: ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'],

            /* ---------- Claves de localStorage ---------- */
            REGEX_STORAGE_KEY: 'paleohebreo.regexes',
            SAVED_ALPHABETS_KEY: 'paleohebreo.savedAlphabets',
            DRAFT_ALPHABET_KEY: 'paleohebreo.customAlphabet',
            ACTIVE_ALPHABET_KEY: 'paleohebreo.activeAlphabet',
            STATE_STORAGE_KEYS: {
                direction: 'paleohebreo.state.direction',
                labels: 'paleohebreo.state.labels',
                sortLength: 'paleohebreo.state.sortLength'
            },

            /* ---------- Valores por defecto ---------- */
            DEFAULT_REGEXES: ['CBF', '^BC', 'BFB', 'BDD$', 'FB$', 'BD$', 'CB$', 'BC$'],
            PRESET_ALPHABETS: [
                { id: 'preset:1', name: 'JEËIÏÍZÚSUÖÜHO_YAÁVÉÄÓ', chars: 'JEËIÏÍZÚSUÖÜHO_YAÁVÉÄÓ'.split('') }
            ],

            /* ---------- Constantes de layout ---------- */
            CELL: 56,
            WORD_GAP: 26,
            DASH_W: 26,
            ROW_H: 90,
            PAD: 40,
            W: 1060,
            CONTENT_W: 1060 - 40 * 2,

            /* ---------- Versículos crudos (Génesis 1) ---------- */
            RAW_VERSES: [
                "arb Tiwarb|Ta miela|Tav mimwe|crae",
                "eTie craev|vebv veT|inp - la kwhv|hvrv mveT|Tehrm miela|mime inp - la",
                "miela rmaiv|rva iei|rva - ieiv",
                "miela ariv|bvt - ik rvae - Ta|miela ldbiv|rvae nib|kwhe nibv",
                "miela arqiv|mvi rval|arq kwhlv|bro - ieiv elil|mvi rqb - ieiv|dha",
                "miela rmaiv|oiqr iei|mime kvTb|lidbm ieiv|mim nib|miml",
                "miela woiv|ldbiv oiqre - Ta|mime nib|ThTm rwa|nibv oiqrl|rwa mime|oiqrl lom|nk - ieiv",
                "miela arqiv|mimw oiqrl|rqb - ieiv bro - ieiv|inw mvi",
                "miela rmaiv|mime vvqi|mimwe ThTm|dha mvqm - la|ewbie earTv|nk - ieiv",
                "miela arqiv|cra ewbil|mime evqmlv|mimi arq|miela ariv|bvt - ik",
                "miela rmaiv|crae awdT|bwo awd|orz oirzm|irp co|irp ewo|rwa vniml|crae - la vb - vorz|nk - ieiv",
                "crae acvTv|bwo awd|orz oirzm|cov veniml|rwa irp - ewo|veniml vb - vorz|miela ariv|bvt - ik",
                "rqb - ieiv bro - ieiv|iwilw mvi",
                "miela rmaiv|Tram iei|mimwe oiqrb|nib lidbel|nibv mvie|viev elile|midovmlv TTal|minwv mimilv",
                "Tvaml viev|mimwe oiqrb|crae - la riael|nk - ieiv",
                "miela woiv|Trame inw - Ta|rvame - Ta mildge|Tlwmml ldge|Tav mvie|ntqe rvame|elile Tlwmml|mibkvke Tav",
                "mTa nTiv|oiqrb miela|riael mimwe|crae - la",
                "mvib lwmlv|lidbelv elilbv|rvae nib|kwhe nibv|miela ariv|bvt - ik",
                "rqb - ieiv bro - ieiv|ioibr mvi",
                "miela rmaiv|mime vcrwi|wpn crw|pvov eih|crae - la ppvoi|oiqr inp - la|mimwe",
                "miela arbiv|mildge mninTe - Ta|wpn - lk Tav|Twmre eihe|vcrw rwa|mpniml mime|pvo - lk Tav|veniml pnk|miela ariv|bvt - ik",
                "mTa krbiv|rmal miela|vbrv vrp|mime - Ta valmv|pvoev mimib|crab bri",
                "rqb - ieiv bro - ieiv|iwimh mvi",
                "miela rmaiv|crae acvT|eih wpn|emeb eniml|crae - vTihv wmrv|nk - ieiv eniml",
                "miela woiv|crae Tih - Ta|emebe - Tav eniml|Tav eniml|emdae wmr - lk|ariv veniml|bvt - ik miela",
                "miela rmaiv|mda pwon|vnTvmdk vnmlcb|Tgdb vdriv|pvobv mie|emebbv mimwe|wmre - lkbv crae - lkbv|crae - la wmre",
                "miela arbiv|vmlcb mdae - Ta|miela mlcb|vTa arb|ebqnv rkz|mTa arb",
                "mTa krbiv|rmaiv miela|miela mpl|vbrv vrp|crae - Ta valmv|vdrv ewbkv|mie Tgdb|mimwe pvobv|Twmre eihe - lkbv|crae - la",
                "miela rmaiv|iTTn ene|bwo - lk - Ta mkl|orz orz|inp - la rwa|crae lk|vb - rwa cop - lk - Tav|orz co - irp|mkl orz|elkal eiei",
                "crae Tih - lklv|mimwe pvo - lklv|wmvr lklv|vb - rwa crae - la|eih wpn|bwo qri - lk - Ta|nk - ieiv elkal",
                "miela ariv|ewo rwa - lk - Ta|dam bvt - enev|rqb - ieiv bro - ieiv|iwwe mvi"
            ],

            /* ---------- Pools para generación aleatoria de abecedarios ---------- */
            RANDOM_ALPHABET_BASE: [
                { ch: 'B', w: 10 }, { ch: 'C', w: 10 }, { ch: 'D', w: 10 },
                { ch: 'F', w: 10 }, { ch: 'G', w: 10 }, { ch: 'J', w: 10 },
                { ch: 'K', w: 10 }, { ch: 'M', w: 10 }, { ch: 'N', w: 10 },
                { ch: 'P', w: 10 }, { ch: 'Q', w: 10 }, { ch: 'S', w: 10 },
                { ch: 'T', w: 10 }, { ch: 'V', w: 10 }, { ch: 'W', w: 10 },
                { ch: 'X', w: 10 }, { ch: 'Y', w: 10 }, { ch: 'Z', w: 10 },
                { ch: 'L', w: 20 }, { ch: 'R', w: 20 }, { ch: 'H', w: 8 },
                { ch: 'Ñ', w: 7 },
                { ch: 'A', w: 9 }, { ch: 'E', w: 9 }, { ch: 'I', w: 9 },
                { ch: 'O', w: 9 }, { ch: 'U', w: 9 },
                { ch: 'Á', w: 5 }, { ch: 'É', w: 5 }, { ch: 'Í', w: 5 },
                { ch: 'Ó', w: 5 }, { ch: 'Ú', w: 5 }, { ch: 'Ü', w: 3 }
            ],
            RANDOM_ALPHABET_EXTRA: [
                { ch: 'Ý', w: 3 }, { ch: 'Ä', w: 2 }, { ch: 'Ë', w: 2 },
                { ch: 'Ï', w: 2 }, { ch: 'Ö', w: 2 }, { ch: 'Ÿ', w: 2 }, { ch: 'Ḧ', w: 1 }
            ],

            /* ---------- Estado mutable del alfabeto actual ---------- */
            customAlphabetChars: 'ABCDEFGHIJKLMNOPQRSTUV'.split(''),
            currentAlphabet: 'ABCDEFGHIJKLMNOPQRSTUV',
            savedAlphabets: [],
            activeAlphabetId: null,
            dragSourceIndex: null,

            /* ---------- Estado mutable de expresiones regulares ---------- */
            regexPatterns: [],
            draggedRegexIndex: null,
            isAlphaAsc: true,
            isFreqAsc: false,
            activeRegexItem: null,
            activeRegexInput: null,
            activeRegexIndex: -1,

            /* NUEVO: pestaña activa del panel de expresiones */
            activeRegexTab: 'none',   // 'none' | 'start' | 'end' | 'both'
            /* NUEVO: modo RTL (solo afecta a la pestaña 'end') */
            regexRTL: false,

            /* ---------- Datos derivados (se rellenan en programa()) ---------- */
            VERSES: [],
            FREQUENCIES: {},
            WORD_FREQUENCIES: {},
            MAX_W: 0,
            SCALE: 1,
            verseRefs: [],

            /* ---------- Estado de UI ---------- */
            currentToast: null,
            currentModalOverlay: null,
            currentModalInput: null,
            currentModalResolve: null,
            currentModalReject: null,
            pendingResolve: null,

            /* ---------- Referencias al DOM (se rellenan en programa()) ---------- */
            dom: {}
        };
    }
    return getState._state;
}
