(function (window, document) {
  function getInput(inputId) {
    return document.getElementById(inputId);
  }

  function ensureMessageNode(inputId) {
    const input = getInput(inputId);
    if (!input || !input.parentNode) return null;

    let message = input.parentNode.querySelector('[data-password-error-for="' + inputId + '"]');
    if (!message) {
      message = document.createElement('div');
      message.setAttribute('data-password-error-for', inputId);
      message.style.color = '#dc3545';
      message.style.fontSize = '12px';
      message.style.marginTop = '6px';
      message.style.minHeight = '18px';
      input.parentNode.appendChild(message);
    }
    return message;
  }

  function clearError(inputId) {
    const message = ensureMessageNode(inputId);
    if (message) {
      message.textContent = '';
      message.style.display = 'none';
    }
  }

  function showError(inputId, text) {
    const message = ensureMessageNode(inputId);
    if (message) {
      message.textContent = text;
      message.style.display = 'block';
    }
  }

  function resetInput(inputId, shouldClear) {
    const input = getInput(inputId);
    if (!input) return;

    if (shouldClear) input.value = '';
    input.removeAttribute('disabled');
    input.readOnly = false;
  }

  function focusInput(inputId, shouldClear) {
    const input = getInput(inputId);
    if (!input) return;

    resetInput(inputId, shouldClear);
    window.setTimeout(function () {
      input.focus();
      if (typeof input.select === 'function') input.select();
    }, 50);
  }

  function cleanupBootstrapArtifacts() {
    const visibleModals = Array.from(document.querySelectorAll('.modal.show')).filter(function (modal) {
      return modal && modal.style.display !== 'none';
    }).length;
    const backdrops = Array.from(document.querySelectorAll('.modal-backdrop'));

    if (visibleModals === 0) {
      backdrops.forEach(function (backdrop) {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      });
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      return;
    }

    backdrops.forEach(function (backdrop, index) {
      const isLast = index === backdrops.length - 1;
      if (!isLast && backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    });
  }

  function releaseBlockedInteractions() {
    const selectors = [
      'body',
      '#body',
      '.page-wrapper',
      '.page-content--bgf7',
      '.main-content',
      '.section__content',
      '.animsition',
      '#app-toast-host'
    ];

    selectors.forEach(function (selector) {
      Array.from(document.querySelectorAll(selector)).forEach(function (node) {
        if (!node || !node.style) return;
        if (selector === '#app-toast-host') {
          node.style.pointerEvents = 'none';
          return;
        }
        node.style.pointerEvents = 'auto';
      });
    });

    Array.from(document.querySelectorAll('.modal')).forEach(function (modal) {
      if (!modal || !modal.style) return;
      const isShown = modal.classList.contains('show') && modal.style.display !== 'none';
      if (isShown) return;
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');
      modal.style.display = 'none';
      modal.style.pointerEvents = 'none';
    });
  }

  function forceReleaseUiLocks() {
    cleanupBootstrapArtifacts();
    releaseBlockedInteractions();
    if (document.body) {
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.body.style.removeProperty('overflow');
    }
  }

  function scheduleCleanup(delay) {
    window.setTimeout(cleanupBootstrapArtifacts, delay || 0);
  }

  function setupModal(modalId, inputId) {
    if (!window.jQuery) return;
    const $modal = window.jQuery(modalId);
    if (!$modal.length) return;

    $modal.off('.modalInputFix');
    $modal.on('show.bs.modal.modalInputFix', function () {
      clearError(inputId);
      cleanupBootstrapArtifacts();
    });
    $modal.on('shown.bs.modal.modalInputFix', function () {
      cleanupBootstrapArtifacts();
      focusInput(inputId, true);
    });
    $modal.on('hidden.bs.modal.modalInputFix', function () {
      clearError(inputId);
      resetInput(inputId, true);
      cleanupBootstrapArtifacts();
    });

    var input = getInput(inputId);
    if (input && !input.dataset.enterBound) {
      input.dataset.enterBound = '1';
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var modal = input.closest('.modal');
          if (modal) {
            var btn = modal.querySelector('.modal-footer .btn-primary');
            if (btn) btn.click();
          }
        }
      });
    }
  }

  function bindGlobalModalCleanup() {
    if (!window.jQuery) return;
    const $doc = window.jQuery(document);

    $doc.off('.modalInputFixGlobal');
    $doc.on('show.bs.modal.modalInputFixGlobal', '.modal', function () {
      cleanupBootstrapArtifacts();
    });
    $doc.on('shown.bs.modal.modalInputFixGlobal', '.modal', function () {
      scheduleCleanup(0);
    });
    $doc.on('hidden.bs.modal.modalInputFixGlobal', '.modal', function () {
      scheduleCleanup(0);
      scheduleCleanup(50);
    });
  }

  const api = {
    setupModal: setupModal,
    showModal: function (modalId) {
      cleanupBootstrapArtifacts();
      if (window.jQuery && window.jQuery(modalId).length) {
        if (modalId === '#staticModal-3') clearError('pass3');
        else if (modalId === '#staticModal-2') clearError('pass2');
        else clearError('pass');
        window.jQuery(modalId).modal('show');
      }
    },
    hideModal: function (modalId) {
      if (window.jQuery && window.jQuery(modalId).length) {
        window.jQuery(modalId).modal('hide');
      }
      window.setTimeout(cleanupBootstrapArtifacts, 0);
    },
    showInvalid: function (inputId, text) {
      showError(inputId, text);
      focusInput(inputId, true);
      forceReleaseUiLocks();
    },
    clearInvalid: clearError,
    cleanupBootstrapArtifacts: cleanupBootstrapArtifacts,
    forceReleaseUiLocks: forceReleaseUiLocks
  };

  window.modalInputFix = api;

  document.addEventListener('DOMContentLoaded', function () {
    bindGlobalModalCleanup();
    setupModal('#staticModal', 'pass');
    setupModal('#staticModal-2', 'pass2');
    setupModal('#staticModal-3', 'pass3');
    forceReleaseUiLocks();
  });

  window.addEventListener('focus', function () {
    window.setTimeout(forceReleaseUiLocks, 0);
    window.setTimeout(forceReleaseUiLocks, 100);
    window.setTimeout(forceReleaseUiLocks, 250);
  });
})(window, document);
