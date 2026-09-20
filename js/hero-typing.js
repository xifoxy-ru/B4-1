import { HERO_TYPING_DELAY } from './config.js';

export const initializeHeroTyping = ({ container, staticText, typingText, reducedMotion }) => {
  if (!container || !staticText || !typingText) {
    return;
  }

  let timer = 0;
  const complete = () => {
    window.clearTimeout(timer);
    typingText.textContent = staticText.textContent;
    typingText.classList.remove('is-typing');
    container.dataset.typingState = 'complete';
  };

  const fullText = staticText.textContent;
  container.classList.add('typing-ready');
  if (reducedMotion.matches) {
    complete();
  } else {
    const segments = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(fullText)].map(({ segment }) => segment)
      : Array.from(fullText);
    let index = 0;
    typingText.textContent = '';
    typingText.classList.add('is-typing');
    container.dataset.typingState = 'running';

    const typeNextSegment = () => {
      if (reducedMotion.matches) {
        complete();
        return;
      }
      typingText.textContent += segments[index];
      index += 1;
      if (index >= segments.length) {
        complete();
        return;
      }
      timer = window.setTimeout(typeNextSegment, HERO_TYPING_DELAY);
    };
    typeNextSegment();
  }

  reducedMotion.addEventListener?.('change', (event) => {
    if (event.matches) {
      complete();
    }
  });
};
