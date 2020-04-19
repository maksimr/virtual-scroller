/**
 * @param {HTMLElement} element
 * @param {function} listener
 * @return {function(...[*]=)} Remove listener function
 */
export function addResizeListener(element, listener) {
  const options = {passive: true, capture: true};
  const resizeObserver = createResizeObserver();
  let prevElementHeight;
  let prevElementWidth;

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
      prevElementHeight !== element.offsetHeight ||
      prevElementWidth !== element.offsetWidth) {
      prevElementHeight = element.offsetHeight;
      prevElementWidth = element.offsetWidth;
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
  /**
   * @type {HTMLElement}
   */
    // @ts-ignore
  const growObserver = resizeObserver.firstChild;
  /**
   * @type {HTMLElement}
   */
    // @ts-ignore
  const shrinkObserver = resizeObserver.lastChild;
  const growObserverOffsetHeight = growObserver.offsetHeight;
  const growObserverOffsetWidth = growObserver.offsetWidth;
  const growObserverScrollHeight = growObserver.scrollHeight;
  const growObserverScrollWidth = growObserver.scrollWidth;
  const shrinkObserverScrollHeight = shrinkObserver.scrollHeight;
  const shrinkObserverScrollWidth = shrinkObserver.scrollWidth;

  queueMicrotask(() => {
    /**
     * @type {HTMLElement}
     */
      // @ts-ignore
    const firstChild = growObserver.firstChild;
    firstChild.style.height = growObserverOffsetHeight + 1 + 'px';
    firstChild.style.width = growObserverOffsetWidth + 1 + 'px';
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
  // @ts-ignore
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
    /**
     * @type {HTMLElement}
     */
      // @ts-ignore
    const firstChild = shrinkObserver.firstChild;
    firstChild.style.height = '200%';
    firstChild.style.width = '200%';

    // @ts-ignore
    createResizeObserver.resizeObserver = resizeObserver;
  }

  // @ts-ignore
  return createResizeObserver.resizeObserver.cloneNode(true);
}

/**
 * @param {function():any} callback
 * @return {Promise<void | number>|void}
 */
function queueMicrotask(callback) {
  if (typeof window.queueMicrotask !== 'function') {
    if (window.Promise) {
      return window.Promise.resolve()
        .then(callback)
        .catch(e => setTimeout(() => { throw e; }));
    }
    return callback();
  }
  return window.queueMicrotask(callback);
}
