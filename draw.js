/* ==================================================================
   FUNCIONES DE DIBUJO DE LETRAS + DATOS DE LETRAS
   ==================================================================
   Este archivo contiene:
     1. Las 22 funciones drawXxx(ctx) que trazan cada letra paleohebrea
        sobre un canvas 100×100 usando el path 2D actual.
     2. alphabetData: array ordenado con los metadatos de las 22 letras
        (forma moderna, nombre, pronunciación, transliteración, draw).
     3. LETTERS: mapa indexado por carácter paleo (a, b, g, …) con el
        nombre y la función de dibujo, usado por drawLetter() en verses.js.

   Se carga después de state.js y antes de utils.js / verses.js.
   ================================================================== */

/* ------------------------------------------------------------------
   1. FUNCIONES DE DIBUJO
   ------------------------------------------------------------------ */
function drawAleph(ctx) { ctx.moveTo(42, 12); ctx.lineTo(46, 88); ctx.moveTo(82, 22); ctx.lineTo(18, 48); ctx.lineTo(78, 72); }
function drawBeyth(ctx) { ctx.moveTo(65, 15); ctx.lineTo(25, 45); ctx.lineTo(65, 45); ctx.lineTo(65, 15); ctx.moveTo(65, 45); ctx.quadraticCurveTo(65, 70, 40, 85); }
function drawGiymel(ctx) { ctx.moveTo(65, 15); ctx.lineTo(65, 85); ctx.moveTo(65, 15); ctx.lineTo(25, 50); }
function drawDaleth(ctx) { ctx.moveTo(65, 15); ctx.lineTo(65, 85); ctx.moveTo(65, 15); ctx.lineTo(25, 50); ctx.moveTo(25, 50); ctx.lineTo(65, 85); }
function drawHe(ctx) { ctx.moveTo(5, 30); ctx.lineTo(50, 11); ctx.moveTo(10, 50); ctx.lineTo(56, 30); ctx.moveTo(15, 70); ctx.lineTo(63, 50); ctx.moveTo(50, 11); ctx.bezierCurveTo(60, 40, 70, 70, 85, 95); }
function drawVav(ctx) { ctx.moveTo(30, 15); ctx.bezierCurveTo(30, 60, 70, 60, 70, 15); ctx.moveTo(50, 48.75); ctx.lineTo(50, 90); }
function drawZayin(ctx) { ctx.moveTo(20, 22); ctx.lineTo(80, 22); ctx.moveTo(20, 78); ctx.lineTo(80, 78); ctx.moveTo(65, 22); ctx.lineTo(35, 78); }
function drawCheyth(ctx) { ctx.moveTo(30, 10); ctx.lineTo(30, 90); ctx.moveTo(70, 10); ctx.lineTo(70, 90); ctx.moveTo(30, 35); ctx.lineTo(70, 35); ctx.moveTo(30, 65); ctx.lineTo(70, 65); }
function drawTeyth(ctx) { ctx.arc(50, 50, 30, 0, Math.PI * 2); ctx.moveTo(29, 29); ctx.lineTo(71, 71); ctx.moveTo(71, 29); ctx.lineTo(29, 71); }
function drawYowd(ctx) { ctx.moveTo(30, 20); ctx.lineTo(70, 20); ctx.lineTo(30, 80); ctx.lineTo(70, 80); ctx.moveTo(60, 35); ctx.lineTo(30, 35); }
function drawKaph(ctx) { ctx.moveTo(50, 50); ctx.lineTo(35, 30); ctx.moveTo(50, 50); ctx.lineTo(25, 45); ctx.moveTo(25, 85); ctx.lineTo(75, 15); }
function drawLamed(ctx) { ctx.moveTo(45, 15); ctx.bezierCurveTo(40, 40, 35, 60, 35, 75); ctx.bezierCurveTo(35, 90, 55, 90, 65, 85); ctx.bezierCurveTo(75, 80, 75, 65, 65, 65); ctx.bezierCurveTo(55, 65, 55, 75, 60, 78); }
function drawMem(ctx) { ctx.moveTo(15, 25); ctx.lineTo(32, 55); ctx.lineTo(50, 25); ctx.lineTo(68, 55); ctx.lineTo(85, 25); ctx.lineTo(85, 85); }
function drawNuwn(ctx) { ctx.moveTo(30, 20); ctx.lineTo(30, 45); ctx.lineTo(65, 20); ctx.lineTo(65, 85); }
function drawSamek(ctx) { ctx.moveTo(50, 15); ctx.lineTo(50, 85); ctx.moveTo(35, 40); ctx.lineTo(85, 20); ctx.moveTo(35, 60); ctx.lineTo(85, 40); ctx.moveTo(35, 80); ctx.lineTo(85, 60); }
function drawAyin(ctx) { ctx.arc(50, 50, 28, 0, Math.PI * 2); }
function drawPhe(ctx) { ctx.moveTo(25, 30); ctx.lineTo(75, 20); ctx.bezierCurveTo(65, 50, 50, 70, 25, 85); }
function drawTsadey(ctx) { ctx.moveTo(30, 15); ctx.lineTo(30, 85); ctx.moveTo(30, 30); ctx.bezierCurveTo(45, 20, 55, 20, 65, 25); ctx.lineTo(65, 45); ctx.bezierCurveTo(72, 45, 80, 35, 85, 35); }
function drawQowph(ctx) { ctx.arc(50, 40, 22, 0, Math.PI * 2); ctx.moveTo(50, 15); ctx.lineTo(50, 85); }
function drawReysh(ctx) { ctx.moveTo(68, 18); ctx.lineTo(68, 82); ctx.moveTo(68, 20); ctx.lineTo(30, 42); ctx.lineTo(68, 58); }
function drawShiyn(ctx) { ctx.moveTo(20, 30); ctx.lineTo(35, 65); ctx.lineTo(50, 45); ctx.lineTo(65, 65); ctx.lineTo(80, 30); }
function drawThav(ctx) { ctx.moveTo(25, 25); ctx.lineTo(75, 75); ctx.moveTo(75, 25); ctx.lineTo(25, 75); }

/* ------------------------------------------------------------------
   2. DATOS DE LAS LETRAS (metadatos + función de dibujo)
   ------------------------------------------------------------------
   Orden canónico 1..22, índice = LETTER_INDEX (a=1, …, T=22).
   `draw` apunta a la función correspondiente de este mismo archivo.
   ------------------------------------------------------------------ */
const alphabetData = [
    { mod: "א", name: "'Aleph (aw'-lef)",         pron: "' - unappreciable",                    trans: "'a",     draw: drawAleph   },
    { mod: "ב", name: "Beyth (bayth)",              pron: "b",                                    trans: "B",      draw: drawBeyth   },
    { mod: "ג", name: "Giymel (ghee'-mel)",         pron: "g - hard = g",                         trans: "G",      draw: drawGiymel  },
    { mod: "ד", name: "Daleth (daw'-leth)",         pron: "d",                                    trans: "D",      draw: drawDaleth  },
    { mod: "ה", name: "He (hay)",                   pron: "h - often quiescent",                  trans: "H",      draw: drawHe      },
    { mod: "ו", name: "Vav (vawv)",                 pron: "v / w — a menudo quiescente",          trans: "V / W",  draw: drawVav     },
    { mod: "ז", name: "Zayin (zah'yin)",            pron: "z, as in zeal",                        trans: "Z",      draw: drawZayin   },
    { mod: "ח", name: "Cheyth (khayth)",            pron: "German ch = C (nearly kh)",            trans: "Ch",     draw: drawCheyth  },
    { mod: "ט", name: "Teyth (tayth)",              pron: "t",                                    trans: "T",      draw: drawTeyth   },
    { mod: "י", name: "Yowd (yode)",                pron: "y, often quiescent",                   trans: "Y",      draw: drawYowd    },
    { mod: "כ", name: "Kaph (caf)",                 pron: "k",                                    trans: "K",      draw: drawKaph    },
    { mod: "ל", name: "Lamed (law'-med)",           pron: "l",                                    trans: "L",      draw: drawLamed   },
    { mod: "מ", name: "Mem (mame)",                 pron: "m",                                    trans: "M",      draw: drawMem     },
    { mod: "נ", name: "Nuwn (noon)",                pron: "n",                                    trans: "N",      draw: drawNuwn    },
    { mod: "ס", name: "Samek (saw'-mek)",           pron: "c = s sharp",                          trans: "S",      draw: drawSamek   },
    { mod: "ע", name: "'Ayin (ah'-yin)",            pron: "' guttural",                           trans: "'y",     draw: drawAyin    },
    { mod: "פ", name: "Phe (fay), Pe (pay)",        pron: "ph = f = f, p",                        trans: "Ph",     draw: drawPhe     },
    { mod: "צ", name: "Tsadey (tsaw-day')",         pron: "ts",                                   trans: "Ts",     draw: drawTsadey  },
    { mod: "ק", name: "Qowph (cofe)",               pron: "q = k",                                trans: "Q",      draw: drawQowph   },
    { mod: "ר", name: "Reysh (raysh)",              pron: "r",                                    trans: "R",      draw: drawReysh   },
    { mod: "ש", name: "Siyn, Shiyn",                pron: "s sharp, sh",                          trans: "Sh",     draw: drawShiyn   },
    { mod: "ת", name: "Thav (thawv), Tav (tawv)",   pron: "t",                                    trans: "Th",     draw: drawThav    }
];

/* ------------------------------------------------------------------
   3. MAPA POR CARÁCTER PALEO
   ------------------------------------------------------------------
   Usado por drawLetter() en verses.js: recibe el carácter (a, b, g, …)
   y devuelve su nombre y función de dibujo.
   ------------------------------------------------------------------ */
const LETTERS = {
    a: { name: "'Aleph",  draw: drawAleph  },
    b: { name: "Beyth",   draw: drawBeyth  },
    g: { name: "Giymel",  draw: drawGiymel },
    d: { name: "Daleth",  draw: drawDaleth },
    e: { name: "He",      draw: drawHe     },
    v: { name: "Vav",     draw: drawVav    },
    z: { name: "Zayin",   draw: drawZayin  },
    h: { name: "Cheyth",  draw: drawCheyth },
    t: { name: "Teyth",   draw: drawTeyth  },
    i: { name: "Yowd",    draw: drawYowd   },
    k: { name: "Kaph",    draw: drawKaph   },
    l: { name: "Lamed",   draw: drawLamed  },
    m: { name: "Mem",     draw: drawMem    },
    n: { name: "Nuwn",    draw: drawNuwn   },
    s: { name: "Samek",   draw: drawSamek  },
    o: { name: "'Ayin",   draw: drawAyin   },
    p: { name: "Phe",     draw: drawPhe    },
    c: { name: "Tsadey",  draw: drawTsadey },
    q: { name: "Qowph",   draw: drawQowph  },
    r: { name: "Reysh",   draw: drawReysh  },
    w: { name: "Shiyn",   draw: drawShiyn  },
    T: { name: "Thav",    draw: drawThav   }
};
