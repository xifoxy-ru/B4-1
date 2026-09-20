import { validateValues } from './validation.js';
import { sendContactEmail } from './email-service.js';

const RESULT_MESSAGES = {
  idle: '',
  validation: '입력 내용을 확인해 주세요.',
  sending: '메시지를 전송하고 있습니다…',
  success: '메시지를 보냈습니다.',
  network: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
  'rate-limit': '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  timeout: '전송 확인 시간이 초과되었습니다. 메시지가 전송되었을 수 있으니 잠시 후 확인해 주세요.',
  service: '메시지를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

export const initializeContactForm = ({ form, result, send = sendContactEmail }) => {
  if (!form || !result) {
    return;
  }
  const submitButton = form.querySelector('[type="submit"]');
  const state = { status: 'idle', errors: {} };
  const render = () => {
    const isSending = state.status === 'sending';
    ['name', 'email', 'message'].forEach((name) => {
      const field = form.elements.namedItem(name);
      const error = form.querySelector(`[data-error-for="${name}"]`);
      const message = state.errors[name] ?? '';
      field?.setAttribute('aria-invalid', String(Boolean(message)));
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.readOnly = isSending;
      }
      if (error) {
        error.textContent = message;
      }
    });
    form.setAttribute('aria-busy', String(isSending));
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = isSending;
      submitButton.textContent = isSending ? '전송 중…' : '메시지 보내기';
    }
    result.textContent = RESULT_MESSAGES[state.status] ?? RESULT_MESSAGES.service;
  };

  render();
  form.addEventListener('input', (event) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || !field.name) {
      return;
    }
    const { [field.name]: ignoredError, ...remainingErrors } = state.errors;
    state.errors = remainingErrors;
    if (state.status !== 'sending') {
      state.status = 'idle';
    }
    render();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.status === 'sending') {
      return;
    }
    const values = Object.fromEntries(['name', 'email', 'message'].map((name) => {
      const field = form.elements.namedItem(name);
      return [name, field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.value : ''];
    }));
    state.errors = validateValues(values);
    state.status = Object.keys(state.errors).length === 0 ? 'sending' : 'validation';
    render();
    if (state.status === 'validation') {
      form.elements.namedItem(Object.keys(state.errors)[0])?.focus();
      return;
    }

    try {
      await send(values);
      form.reset();
      state.status = 'success';
    } catch (error) {
      state.status = typeof error?.code === 'string' && RESULT_MESSAGES[error.code] ? error.code : 'service';
    }
    render();
  });
};
