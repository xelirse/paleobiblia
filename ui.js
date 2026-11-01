/* ==================================================================
   COMPONENTES DE UI (Toast & Modal)
   ==================================================================
   Este archivo contiene exclusivamente los dos componentes de UI
   reutilizables de la aplicación:

     1. Toast: notificación efímera en la parte inferior de la pantalla.
     2. Modal: diálogo con título, mensaje opcional, input opcional y
        botones Aceptar/Cancelar, que devuelve una Promise.

   No depende de otros módulos del proyecto salvo getState() (state.js),
   y no debe contener lógica de negocio.

   Se carga después de state.js y antes de los módulos que usan
   showToast()/showModal() (regex.js, alphabet.js, random-alphabet.js,
   events.js, main.js).
   ================================================================== */

/* ==================================================================
   TOAST
   ==================================================================
   Comportamiento:
     - Solo hay un toast visible a la vez; al mostrar uno nuevo se
       elimina el anterior.
     - Cada toast captura su propio elemento en el closure, de modo
       que sus timers no pueden ocultar/eliminar un toast posterior
       (evita la carrera entre dos showToast() seguidos).
   ================================================================== */
function removeToastElement(el) {
    const S = getState();
    if (el && el.parentNode) el.remove();
    if (S.currentToast === el) S.currentToast = null;
}

function hideToastElement(el) {
    const S = getState();
    if (!el || S.currentToast !== el) return;
    el.classList.remove('toast-visible');
    setTimeout(function () { removeToastElement(el); }, 350);
}

function showToastElement(el) {
    const S = getState();
    if (el && S.currentToast === el) el.classList.add('toast-visible');
}

function showToast(message, type, duration) {
    const S = getState();
    // Reemplaza cualquier toast anterior.
    if (S.currentToast) {
        S.currentToast.remove();
        S.currentToast = null;
    }

    type = type || 'info';
    duration = duration || 4000;

    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = message;
    document.body.appendChild(el);
    S.currentToast = el;

    // Animación de entrada.
    setTimeout(function () { showToastElement(el); }, 10);
    // Animación de salida (solo si este toast sigue siendo el activo).
    setTimeout(function () { hideToastElement(el); }, duration);
}

/* ==================================================================
   MODAL
   ==================================================================
   showModal() devuelve una Promise que resuelve con:
     - el valor del input si input === true,
     - true si input === false (confirmación simple).

   La Promise se rechaza con Error('Cancelado') si el usuario cancela
   (botón Cancelar, tecla Escape o click fuera del modal, si se añade).
   ================================================================== */
function closeModal() {
    const S = getState();
    if (S.currentModalOverlay) {
        S.currentModalOverlay.remove();
        S.currentModalOverlay = null;
        S.currentModalInput = null;
        S.currentModalResolve = null;
        S.currentModalReject = null;
    }
}

function handleModalCancelClick() {
    const S = getState();
    const rejectFn = S.currentModalReject;
    closeModal();
    if (rejectFn) rejectFn(new Error('Cancelado'));
}

function handleModalConfirmClick() {
    const S = getState();
    const inputEl = S.currentModalInput;
    const resolveFn = S.currentModalResolve;
    const val = inputEl ? inputEl.value : true;
    closeModal();
    if (resolveFn) resolveFn(val);
}

function handleModalOverlayKeydown(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        handleModalCancelClick();
    } else if (e.key === 'Enter') {
        const S = getState();
        if (S.currentModalInput && e.target === S.currentModalInput) {
            e.preventDefault();
            handleModalConfirmClick();
        } else if (!S.currentModalInput) {
            e.preventDefault();
            handleModalConfirmClick();
        }
    }
}

function returnPromise(resolve, reject) {
    const S = getState();
    S.currentModalResolve = resolve;
    S.currentModalReject = reject;
}

function showModal(title, message, input, inputValue, inputPlaceholder, confirmText, cancelText) {
    const S = getState();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const h = document.createElement('h3');
    h.className = 'modal-title';
    h.textContent = title;
    modal.appendChild(h);

    if (message) {
        const p = document.createElement('p');
        p.className = 'modal-message';
        p.textContent = message;
        modal.appendChild(p);
    }

    let inputEl = null;
    if (input) {
        inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.className = 'modal-input';
        inputEl.value = inputValue || '';
        if (inputPlaceholder) inputEl.placeholder = inputPlaceholder;
        modal.appendChild(inputEl);
    }

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'modal-btn modal-btn-cancel';
    cancelBtn.textContent = cancelText || 'Cancelar';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'modal-btn modal-btn-confirm';
    confirmBtn.textContent = confirmText || 'Aceptar';

    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);
    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    S.currentModalOverlay = overlay;
    S.currentModalInput = inputEl;

    if (inputEl) {
        inputEl.focus();
        inputEl.select();
    } else {
        confirmBtn.focus();
    }

    cancelBtn.addEventListener('click', handleModalCancelClick);
    confirmBtn.addEventListener('click', handleModalConfirmClick);
    overlay.addEventListener('keydown', handleModalOverlayKeydown);

    return new Promise(returnPromise);
}
