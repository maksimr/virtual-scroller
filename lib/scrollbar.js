export class Scrollbar {
  /**
   * @typedef {{totalSize: number, scrollListener: function(...[*]=), horizontal: boolean=, scrollTop: number=}} ScrollbarParams
   */
  /**
   * @param {Element} viewportNode
   * @param {ScrollbarParams} params
   * @return {Scrollbar}
   */
  static builder(viewportNode, params) {
    return new Scrollbar(viewportNode, params);
  }

  /**
   * @param {Element} viewportNode
   * @param {ScrollbarParams} params
   */
  constructor(viewportNode, params) {
    /**
     * @public
     * @type number
     */
    this.scrollTop = 0;

    /**
     * @private
     * @type Element
     */
    this.viewportNode = viewportNode;
    /**
     * @private
     * @type Element
     */
    this.scrollNode = findScrollableNode(this.viewportNode);
    /**
     * @private
     * @type Element
     */
    this.scrollListenNode = this.scrollNode === document.documentElement ? window : this.scrollNode;
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
    this.viewportSize = this.horizontal ? this.scrollNode.clientWidth : this.scrollNode.clientHeight;
    /**
     * @private
     * @type {number}
     */
    this.maxBrowserScrollSize = calcMaxBrowserScrollSize(this.horizontal);

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
     */
    this.scrollRafId = null;

    /**
     * @private
     * @type number
     */
    this.currentPageOffset = 0;

    /**
     * @private
     * @type Element
     */
    this.runwayNode = document.createElement('div');
    this.runwayNode.style[this.horizontal ? 'width' : 'height'] = this.scrollSize + 'px';
    this.runwayNode.style.position = 'relative';
    this.runwayNode.style.visibility = 'hidden';
    this.runwayNode.style.overflow = 'hidden';
    this.runwayNode.style.width = '1px';

    this.updateTotalSize(params.totalSize || 0);

    if (window.getComputedStyle(this.viewportNode).position === 'static') {
      this.viewportNode.style.position = 'relative';
    }

    if (this.viewportNode.firstChild) {
      this.viewportNode.insertBefore(this.runwayNode, this.viewportNode.firstChild);
    } else {
      this.viewportNode.appendChild(this.runwayNode);
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
    this.scrollTop = this.getViewportScrollTop() + this.currentPageOffset;
    this.scrollListener();
  }

  /**
   * @private
   * @return {number}
   */
  getViewportScrollTop() {
    return this.scrollNode !== this.viewportNode ?
      Math.max(this.scrollNode.scrollTop - this.viewportNode.offsetTop, 0) :
      this.scrollNode.scrollTop;
  }

  /**
   * @private
   * @param {number} viewportScrollTop
   * @return {number}
   */
  setViewportScrollTop(viewportScrollTop) {
    return this.scrollNode.scrollTop = viewportScrollTop;
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
      this.setViewportScrollTop(this.getViewportScrollTop() - this.overlapSize);
    } else if (prevPage > currentPage) {
      this.setViewportScrollTop(this.getViewportScrollTop() + this.overlapSize);
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
    this.scrollListenNode.addEventListener('scroll', this.onScroll);
  }

  /**
   * @private
   */
  removeScrollListener() {
    this.scrollListenNode.removeEventListener('scroll', this.onScroll);
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
    this.scrollSize = this.maxBrowserScrollSize > this.totalSize ? this.totalSize : this.maxBrowserScrollSize;
    /**
     * @private
     * @type {number}
     */
    this.pageSize = Math.floor(this.maxBrowserScrollSize / 100);
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
    this.overlapSize = this.totalSize > this.maxBrowserScrollSize ? (this.totalSize - this.maxBrowserScrollSize) / (this.pageCount - 1) : 1;

    /**
     * @private
     * @type {number}
     */
    this.currentPageOffset = Math.round(this.currentPage * this.overlapSize);

    this.runwayNode.style[this.horizontal ? 'width' : 'height'] = this.scrollSize + 'px';

    if (this.scrollTop > (this.totalSize - this.viewportSize)) {
      this.scrollTop = (this.totalSize - this.viewportSize);
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
      this.setViewportScrollTop(this.prevViewportScrollTop = this.prevViewportScrollTop - this.currentPage * (this.overlapSize - prevOverlapSize));
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * @public
   * @param {number} scrollPosition
   */
  scrollTo(scrollPosition) {
    if (this.scrollTop !== scrollPosition) {
      this.scrollTop = Math.max(scrollPosition, 0);
      const scrollPage = Math.floor(scrollPosition / this.pageSize);
      this.setCurrentPage(scrollPage);
      this.setViewportScrollTop(this.prevViewportScrollTop = scrollPosition - this.currentPageOffset);
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
    this.viewportNode.removeChild(this.runwayNode);
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
 * @param {Element|Node} node
 * @return {Element}
 */
export function findScrollableNode(node) {
  while (node.parentNode && node.parentNode !== document) {
    const overflow = window.getComputedStyle(node).overflow;
    if (overflow === 'visible' || overflow === '') {
      node = node.parentNode;
      continue;
    }
    break;
  }
  return node;
}