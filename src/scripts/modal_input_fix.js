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
    const visibleModals = document.querySelectorAll('.modal.show').length;
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
  }

  const api = {
    setupModal: setupModal,
    showModal: function (modalId) {
      cleanupBootstrapArtifacts();
      if (window.jQuery && window.jQuery(modalId).length) {
        clearError(modalId === '#staticModal-2' ? 'pass2' : 'pass');
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
      cleanupBootstrapArtifacts();
    },
    clearInvalid: clearError,
    cleanupBootstrapArtifacts: cleanupBootstrapArtifacts
  };

  window.modalInputFix = api;

  document.addEventListener('DOMContentLoaded', function () {
    setupModal('#staticModal', 'pass');
    setupModal('#staticModal-2', 'pass2');
    cleanupBootstrapArtifacts();
  });
})(window, document);
