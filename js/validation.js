const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;
const EMAIL_DOMAIN_LABEL_MAX_LENGTH = 63;
const EMAIL_UNSAFE_CHARACTER_PATTERN = /[\s<>"()[\]\\,;:\u0000-\u001f\u007f]/u;
const DOMAIN_LABEL_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;
const DOMAIN_SUFFIX_PATTERN = /^(?:\p{L}{2,}|xn--[a-z0-9-]{2,})$/iu;

export const isPracticalEmail = (value) => {
  if (value.length > EMAIL_MAX_LENGTH || EMAIL_UNSAFE_CHARACTER_PATTERN.test(value)) {
    return false;
  }
  const parts = value.split('@');
  if (parts.length !== 2) {
    return false;
  }
  const [local, domain] = parts;
  if (!local || !domain || local.length > EMAIL_LOCAL_MAX_LENGTH || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return false;
  }
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }
  const labels = domain.split('.');
  if (labels.length < 2 || labels.some((label) => label.length > EMAIL_DOMAIN_LABEL_MAX_LENGTH || !DOMAIN_LABEL_PATTERN.test(label))) {
    return false;
  }
  return DOMAIN_SUFFIX_PATTERN.test(labels.at(-1));
};


export const fieldMessage = (name, value) => {
  if (!value.trim()) {
    const prompts = { name: '이름을', email: '이메일을', message: '메시지를' };
    return `${prompts[name]} 입력해 주세요.`;
  }
  if (name === 'email' && !isPracticalEmail(value)) {
    return '올바른 이메일 형식을 입력해 주세요.';
  }
  return '';
};

export const validateValues = (values) => ['name', 'email', 'message'].reduce((errors, name) => {
  const message = fieldMessage(name, typeof values[name] === 'string' ? values[name] : '');
  if (message) {
    errors[name] = message;
  }
  return errors;
}, {});
