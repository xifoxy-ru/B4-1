import {
  CONTACT_REQUEST_TIMEOUT,
  EMAILJS_ENDPOINT,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
} from './config.js';

export class EmailSendError extends Error {
  constructor(code) {
    super(code);
    this.name = 'EmailSendError';
    this.code = code;
  }
}

export const sendContactEmail = async (
  { name, email, message },
  { fetchImpl = globalThis.fetch, timeout = CONTACT_REQUEST_TIMEOUT } = {},
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  let response;

  try {
    response = await fetchImpl(EMAILJS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: { name, email, message },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new EmailSendError('timeout');
    }
    throw new EmailSendError('network');
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    throw new EmailSendError('rate-limit');
  }
  if (!response.ok) {
    throw new EmailSendError('service');
  }
};
