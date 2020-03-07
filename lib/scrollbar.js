export class Scrollbar {
  /**
   * @typedef {{totalSize: number, scrollListener: function(...[*]=), horizontal: boolean=, scrollTop: number=}} ScrollbarParams
   */
  /**
   * @param {Element} viewportElement
   * @param {ScrollbarParams} params
   * @return {Scrollbar}
   */
  static builder(viewportElement, params) {
    return new Scrollbar(viewportElement, params);
  }

  /**
   * @param {Element} viewportElement
   * @param {ScrollbarParams} params
   */
  constructor(viewportElement, params) {
    /**
     * @public
     * @type number
     */
    this.scrollTop = 0;

    /**
     * @private
     * @type Element
     */
    this.viewportElement = viewportElement;
    /**
     * @private
     * @type Element
     */
    this.scrollElement = findScrollableElement(this.viewportElement);
    /**
     * @private
     * @type Element
     */
    this.scrollListenElement = this.scrollElement === document.documentElement ? window : this.scrollElement;
    /**
     * @private
     * @type function()
     */
    this.scrollListener = params.scrollListener;
    /**
     * @private
     * @type boolean
     */
    this.horizontal = params.horizontal;
    /**
     * @public
     * @type number
     */
    this.viewportSize = this.horizontal ? this.scrollElement.clientWidth : this.scrollElement.clientHeight;
    /**
     * Divide on 2 because it's too performance consuming and complicated handle case when offset between
     * scroll node and viewport is changed dynamically we should also change max browser scroll size too.
     * And Chrome works significantly slower and janky when you have a scrollbar with maximal height
     * @private
     * @type {number}
     */
    this.maxScrollSize = Math.round(calcMaxBrowserScrollSize(this.horizontal) / 2);

    /**
     * @private
     * @type number
     */
    this.currentPage = 0;
    /**
     * @private
     * @type number
     */
    this.prevViewportScrollTop = 0;

    /**
     * @private
     * @type number
     */
    this.currentPageOffset = 0;

    /**
     * @private
     * @type Element
     */
    this.runwayElement = document.createElement('div');
    this.runwayElement.style[this.horizontal ? 'width' : 'height'] = this.scrollSize + 'px';
    this.runwayElement.style.position = 'relative';
    this.runwayElement.style.visibility = 'hidden';
    this.runwayElement.style.overflow = 'hidden';
    this.runwayElement.style.width = '1px';

    this.updateTotalSize(params.totalSize || 0);

    if (window.getComputedStyle(this.viewportElement).position === 'static') {
      this.viewportElement.style.position = 'relative';
    }

    if (this.viewportElement.firstChild) {
      this.viewportElement.insertBefore(this.runwayElement, this.viewportElement.firstChild);
    } else {
      this.viewportElement.appendChild(this.runwayElement);
    }

    this.addScrollListener();

    if (params.scrollTop) {
      this.scrollTo(params.scrollTop);
    }
  }

  /**
   * @private
   */
  onScroll() {
    const viewportScrollTop = this.getViewportScrollTop();
    if (Math.abs(viewportScrollTop - this.prevViewportScrollTop) > this.viewportSize) {
      this.onJump();
    } else {
      this.onSmoothScroll();
    }

    this.prevViewportScrollTop = this.getViewportScrollTop();
    this.updateScrollTop(this.getViewportScrollTop() + this.currentPageOffset);
    this.scrollListener();
  }

  /**
   * @private
   * @param {number} scrollTop
   */
  updateScrollTop(scrollTop) {
    this.scrollTop = Math.max(scrollTop, 0);
  }

  /**
   * @private
   * @return {number}
   */
  getViewportScrollTop() {
    return Math.max(this.scrollElement.scrollTop - this.getOffsetBetweenScrollElementAndViewport(), 0);
  }

  /**
   * @private
   * @return {number}
   */
  getOffsetBetweenScrollElementAndViewport() {
    return this.scrollElement !== this.viewportElement ? findOffsetBetween(this.viewportElement, this.scrollElement) : 0;
  }

  /**
   * @private
   * @param {number} viewportScrollTop
   * @return {number}
   */
  viewportScrollTo(viewportScrollTop) {
    const offset = this.getOffsetBetweenScrollElementAndViewport();
    return this.scrollElement.scrollTop = viewportScrollTop + offset;
  }

  /**
   * @private
   */
  onSmoothScroll() {
    const scrollTop = this.getViewportScrollTop();

    if (scrollTop + this.currentPageOffset > (this.currentPage + 1) * this.pageSize) {
      this.scrollToNextPage();
    } else if (this.currentPage && (scrollTop + this.currentPageOffset) < this.currentPage * this.pageSize) {
      this.scrollToPrevPage();
    }
  }

  /**
   * @private
   */
  scrollToNextPage() {
    this.scrollOnPage(this.currentPage + 1);
  }

  /**
   * @private
   */
  scrollToPrevPage() {
    this.scrollOnPage(this.currentPage - 1);
  }

  /**
   * @private
   */
  onJump() {
    const viewportScrollTop = this.getViewportScrollTop();
    // convert actual pixels to total pixels
    const scrollTop = viewportScrollTop * ((this.totalSize - this.viewportSize) / (this.scrollSize - this.viewportSize));
    const pageNumber = Math.floor(scrollTop / this.pageSize);
    this.setCurrentPage(pageNumber);
  }

  /**
   * @private
   * @param {number} currentPage
   */
  scrollOnPage(currentPage) {
    const prevPage = this.currentPage;
    if (prevPage < currentPage) {
      this.viewportScrollTo(this.getViewportScrollTop() - this.overlapSize);
    } else if (prevPage > currentPage) {
      this.viewportScrollTo(this.getViewportScrollTop() + this.overlapSize);
    }
    this.setCurrentPage(currentPage);
  }

  /**
   * @private
   * @param {number} currentPage
   */
  setCurrentPage(currentPage) {
    if (currentPage !== this.currentPage) {
      this.currentPage = Math.max(currentPage, 0);
      this.currentPageOffset = Math.round(this.currentPage * this.overlapSize);
    }
  }

  /**
   * @private
   */
  addScrollListener() {
    /**
     * @private
     */
    this.onScroll = this.onScroll.bind(this);
    this.scrollListenElement.addEventListener('scroll', this.onScroll);
  }

  /**
   * @private
   */
  removeScrollListener() {
    this.scrollListenElement.removeEventListener('scroll', this.onScroll);
  }

  /**
   * @public
   * @param {number} totalSize
   */
  updateTotalSize(totalSize) {
    if (this.totalSize === totalSize) {
      return;
    }

    /**
     * @public
     * @type {number}
     */
    this.totalSize = totalSize;
    /**
     * @private
     * @type {number}
     */
    this.scrollSize = this.maxScrollSize > this.totalSize ? this.totalSize : this.maxScrollSize;
    /**
     * @private
     * @type {number}
     */
    this.pageSize = Math.floor(this.maxScrollSize / 100);
    /**
     * @private
     * @type {number}
     */
    this.pageCount = Math.ceil(this.totalSize / this.pageSize);

    const prevOverlapSize = this.overlapSize;
    /**
     * @private
     * @type {number}
     */
    this.overlapSize = this.totalSize > this.maxScrollSize ? (this.totalSize - this.maxScrollSize) / (this.pageCount - 1) : 1;

    /**
     * @private
     * @type {number}
     */
    this.currentPageOffset = Math.round(this.currentPage * this.overlapSize);

    this.runwayElement.style[this.horizontal ? 'width' : 'height'] = this.scrollSize + 'px';

    if (this.scrollTop > (this.totalSize - this.viewportSize)) {
      this.updateScrollTop(this.totalSize - this.viewportSize);
    }

    // If we on the last page and user has updated totalSize
    // we should check overlap size and if new overlap size is
    // bigger than previous we should remove this difference by
    // jumping back on this size otherwise it can lead to the problem
    // that we have reach the bottom and can not scroll future but
    // totalSize say that we should have scroll possibility
    if (
      this.currentPage === this.pageCount - 1 &&
      prevOverlapSize &&
      prevOverlapSize < this.overlapSize) {
      this.prevViewportScrollTop = this.viewportScrollTo(this.prevViewportScrollTop - this.currentPage * (this.overlapSize - prevOverlapSize));
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @public
   * @param {number} scrollPosition
   */
  scrollTo(scrollPosition) {
    if (this.scrollTop !== scrollPosition) {
      this.updateScrollTop(scrollPosition);
      const scrollPage = Math.floor(scrollPosition / this.pageSize);
      this.setCurrentPage(scrollPage);
      this.prevViewportScrollTop = this.viewportScrollTo(scrollPosition - this.currentPageOffset);
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @public
   * Calculate actual position on viewport for passed scrollbar position
   * @param {number} position
   * @return {number}
   */
  calc(position) {
    return position - this.currentPageOffset;
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @public
   */
  destroy() {
    this.viewportElement.removeChild(this.runwayElement);
    this.removeScrollListener();
  }
}

/**
 * @param {boolean=} horizontal
 * @return {number}
 */
export function calcMaxBrowserScrollSize(horizontal) {
  const bigNumber = '9999999999999999px';
  const div = document.createElement('div');
  const style = div.style;
  style.position = 'absolute';
  style.left = bigNumber;
  style.top = bigNumber;
  document.body.appendChild(div);

  const size = div.getBoundingClientRect()[horizontal ? 'left' : 'top'] || parseInt(bigNumber);
  document.body.removeChild(div);
  return Math.abs(size);
}

/**
 * @param {Element|Node} element
 * @return {Element}
 */
export function findScrollableElement(element) {
  while (element.parentNode && element.parentNode !== document) {
    const overflow = window.getComputedStyle(element).overflow;
    if (overflow === 'visible' || overflow === '') {
      element = element.parentNode;
      continue;
    }
    break;
  }
  return element;
}

/**
 * @param {(Element|HTMLElement|Node)} element
 * @param {(Element|HTMLElement|Node)} scrollElement
 * @return {number}
 */
function findOffsetBetween(element, scrollElement) {
  // If scrollElement is documentElement we can
  // calculate it by getBoundingClientRect and dont traverse all parents
  if (scrollElement === document.documentElement) {
    return element.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top;
  }

  let offset = 0;
  while (element && element.parentNode && element !== scrollElement) {
    // noinspection JSValidateTypes
    /**
     * @type {HTMLElement}
     */
    const parentNode = element.parentNode;
    offset = (window.getComputedStyle(parentNode).position !== 'static') ?
      offset + (element.offsetTop) :
      offset + (element.offsetTop - parentNode.offsetTop);
    element = parentNode;
  }
  return offset;
}