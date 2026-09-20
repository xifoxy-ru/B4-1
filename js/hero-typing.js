import { HERO_TYPING_DELAY } from './config.js';

const graphemes = (text) => typeof Intl.Segmenter === 'function'
  ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(text)].map(({ segment }) => segment)
  : Array.from(text);

export const initializeHeroTyping = ({
  container, staticText, typingText, title, titleStatic, titleFirstLine, titleSecondLine, reducedMotion,
}) => {
  if (!container || !staticText || !typingText || !title || !titleStatic || !titleFirstLine || !titleSecondLine) {
    return;
  }

  let timer = 0;
  const complete = () => {
    window.clearTimeout(timer);
    titleFirstLine.textContent = titleStatic.childNodes[0]?.textContent ?? '';
    titleSecondLine.textContent = titleStatic.querySelector('span')?.textContent ?? '';
    typingText.textContent = staticText.textContent;
    titleFirstLine.classList.remove('is-typing');
    titleSecondLine.classList.remove('is-typing');
    typingText.classList.remove('is-typing');
    title.dataset.typingState = 'complete';
    container.dataset.typingState = 'complete';
  };

  const titleSegments = [
    { target: titleFirstLine, segments: graphemes(titleStatic.childNodes[0]?.textContent ?? '') },
    { target: titleSecondLine, segments: graphemes(titleStatic.querySelector('span')?.textContent ?? '') },
  ];
  const descriptionSegments = graphemes(staticText.textContent);
  const sequences = [...titleSegments, { target: typingText, segments: descriptionSegments }];
  title.classList.add('typing-ready');
  container.classList.add('typing-ready');
  if (reducedMotion.matches) {
    complete();
  } else {
    let sequenceIndex = 0;
    let segmentIndex = 0;
    titleFirstLine.textContent = '';
    titleSecondLine.textContent = '';
    typingText.textContent = '';
    titleFirstLine.classList.add('is-typing');
    title.dataset.typingState = 'running';
    container.dataset.typingState = 'running';

    const typeNextSegment = () => {
      if (reducedMotion.matches) {
        complete();
        return;
      }
      const sequence = sequences[sequenceIndex];
      sequence.target.textContent += sequence.segments[segmentIndex];
      segmentIndex += 1;
      if (segmentIndex >= sequence.segments.length) {
        sequence.target.classList.remove('is-typing');
        sequenceIndex += 1;
        segmentIndex = 0;
        if (sequenceIndex < sequences.length) {
          sequences[sequenceIndex].target.classList.add('is-typing');
        }
      }
      if (sequenceIndex >= sequences.length) {
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
