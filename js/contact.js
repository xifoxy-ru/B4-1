import { validateValues } from './validation.js';

export const initializeContactForm = ({ form, result }) => {
  if (!form || !result) {
    return;
  }
  const state = { status: 'idle', errors: {} };
  const render = () => {
    ['name', 'email', 'message'].forEach((name) => {
      const field = form.elements.namedItem(name);
      const error = form.querySelector(`[data-error-for="${name}"]`);
      const message = state.errors[name] ?? '';
      field?.setAttribute('aria-invalid', String(Boolean(message)));
      if (error) {
        error.textContent = message;
      }
    });
    const messages = {
      idle: '',
      error: '입력 내용을 확인해 주세요.',
      success: '로컬 데모 확인이 완료되었습니다. 메시지는 전송되거나 저장되지 않았습니다.',
    };
    result.textContent = messages[state.status];
  };

  render();
  form.addEventListener('input', (event) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || !field.name) {
      return;
    }
    const { [field.name]: ignoredError, ...remainingErrors } = state.errors;
    state.errors = remainingErrors;
    state.status = 'idle';
    render();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(['name', 'email', 'message'].map((name) => {
      const field = form.elements.namedItem(name);
      return [name, field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.value : ''];
    }));
    state.errors = validateValues(values);
    state.status = Object.keys(state.errors).length === 0 ? 'success' : 'error';
    render();
    if (state.status === 'error') {
      form.elements.namedItem(Object.keys(state.errors)[0])?.focus();
    } else {
      form.reset();
    }
  });
};
