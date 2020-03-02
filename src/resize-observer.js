/**
 * @param {HTMLElement} element
 * @param {function} listener
 * @return {function(...[*]=)} Remove listener function
 */
export function addResizeListener(element, listener) {
  const options = {passive: true, capture: true};
  const resizeObserver = createResizeObserver();

  if (element.style.position === 'static') {
    element.style.position = 'relative';
  }

  element.appendChild(resizeObserver);
  resizeObserver.addEventListener('scroll', onScroll, options);

  // Postpone calculation to avoid "Layout Thrashing"
  queueMicrotask(() => setupTriggers(resizeObserver));

  return () => {
    resizeObserver.removeEventListener('scroll', onScroll, options);
    element.removeChild(resizeObserver);
  };

  function onScroll(event) {
    if (
      onScroll.prevElementHeight !== element.offsetHeight ||
      onScroll.prevElementWidth !== element.offsetWidth) {
      onScroll.prevElementHeight = element.offsetHeight;
      onScroll.prevElementWidth = element.offsetWidth;
      const resizeObserver = event.currentTarget;
      setupTriggers(resizeObserver);
      listener(element);
    }
  }
}

/**
 * @param {Node} resizeObserver
 */
function setupTriggers(resizeObserver) {
  const growObserver = resizeObserver.firstChild;
  const shrinkObserver = resizeObserver.lastChild;
  const growObserverOffsetHeight = growObserver.offsetHeight;
  const growObserverOffsetWidth = growObserver.offsetWidth;
  const growObserverScrollHeight = growObserver.scrollHeight;
  const growObserverScrollWidth = growObserver.scrollWidth;
  const shrinkObserverScrollHeight = shrinkObserver.scrollHeight;
  const shrinkObserverScrollWidth = shrinkObserver.scrollWidth;

  queueMicrotask(() => {
    growObserver.firstChild.style.height = growObserverOffsetHeight + 1 + 'px';
    growObserver.firstChild.style.width = growObserverOffsetWidth + 1 + 'px';
    queueMicrotask(setupScrollPosition);
  });

  function setupScrollPosition() {
    growObserver.scrollTop = growObserverScrollHeight;
    growObserver.scrollLeft = growObserverScrollWidth;
    shrinkObserver.scrollTop = shrinkObserverScrollHeight;
    shrinkObserver.scrollLeft = shrinkObserverScrollWidth;
  }
}

/**
 * @return {Node}
 */
function createResizeObserver() {
  if (!createResizeObserver.resizeObserver) {
    const resizeObserver = document.createElement('div');
    const growObserver = document.createElement('div');
    const shrinkObserver = document.createElement('div');
    const style = 'position: absolute; height: 100%; width: 100%; top:0; left:0; opacity: 0; visibility: hidden; z-index: -1; overflow: hidden; contain: paint size style; pointer-events: none;';

    resizeObserver.setAttribute('style', style);
    growObserver.setAttribute('style', style);
    shrinkObserver.setAttribute('style', style);
    growObserver.style.overflow = shrinkObserver.style.overflow = 'auto';
    growObserver.appendChild(document.createElement('div'));
    shrinkObserver.appendChild(document.createElement('div'));
    resizeObserver.appendChild(growObserver);
    resizeObserver.appendChild(shrinkObserver);
    shrinkObserver.firstChild.style.height = '200%';
    shrinkObserver.firstChild.style.width = '200%';

    createResizeObserver.resizeObserver = resizeObserver;
  }

  return createResizeObserver.resizeObserver.cloneNode(true);
}

if (typeof window.queueMicrotask !== 'function') {
  window.queueMicrotask = function(callback) {
    Promise.resolve()
      .then(callback)
      .catch(e => setTimeout(() => { throw e; }));
  };
}
