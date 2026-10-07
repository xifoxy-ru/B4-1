import { TEXTAREA_RESIZE_LARGE_STEP, TEXTAREA_RESIZE_STEP } from './config.js';

export const initializeTextareaResize = ({ textarea, corner }) => {
  if (!textarea || !corner) {
    return;
  }
  let resizeStart = null;
  const heightSheet = new CSSStyleSheet();
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, heightSheet];
  let renderedHeight = null;
  const heightLimits = () => {
    const styles = window.getComputedStyle(textarea);
    return {
      minimum: Number.parseFloat(styles.minHeight) || 0,
      maximum: Number.parseFloat(styles.maxHeight) || Number.POSITIVE_INFINITY,
    };
  };
  const renderHeight = (requestedHeight) => {
    const { minimum, maximum } = heightLimits();
    const height = Math.min(maximum, Math.max(minimum, requestedHeight));
    if (height !== renderedHeight) {
      heightSheet.replaceSync(`#contact-message { height: ${height}px; }`);
      renderedHeight = height;
    }
    corner.setAttribute('aria-valuemin', String(Math.round(minimum)));
    corner.setAttribute('aria-valuemax', String(Math.round(maximum)));
    corner.setAttribute('aria-valuenow', String(Math.round(height)));
    corner.setAttribute('aria-valuetext', `메시지 입력창 높이 ${Math.round(height)}픽셀`);
  };

  corner.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    event.preventDefault();
    corner.focus({ preventScroll: true });
    resizeStart = { pointerId: event.pointerId, y: event.clientY, height: textarea.getBoundingClientRect().height };
    corner.setPointerCapture(event.pointerId);
    corner.classList.add('is-resizing');
  });
  corner.addEventListener('pointermove', (event) => {
    if (resizeStart && event.pointerId === resizeStart.pointerId) {
      renderHeight(resizeStart.height + event.clientY - resizeStart.y);
    }
  });
  const finishResize = (event) => {
    if (!resizeStart || event.pointerId !== resizeStart.pointerId) {
      return;
    }
    if (corner.hasPointerCapture(event.pointerId)) {
      corner.releasePointerCapture(event.pointerId);
    }
    resizeStart = null;
    corner.classList.remove('is-resizing');
  };
  corner.addEventListener('pointerup', finishResize);
  corner.addEventListener('pointercancel', finishResize);
  corner.addEventListener('lostpointercapture', finishResize);
  corner.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? TEXTAREA_RESIZE_LARGE_STEP : TEXTAREA_RESIZE_STEP;
    const { minimum, maximum } = heightLimits();
    const currentHeight = textarea.getBoundingClientRect().height;
    const requestedHeights = { ArrowUp: currentHeight - step, ArrowDown: currentHeight + step, Home: minimum, End: maximum };
    if (!(event.key in requestedHeights)) {
      return;
    }
    event.preventDefault();
    renderHeight(requestedHeights[event.key]);
  });

  renderHeight(textarea.getBoundingClientRect().height);
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => renderHeight(textarea.getBoundingClientRect().height)).observe(textarea);
  }
};
