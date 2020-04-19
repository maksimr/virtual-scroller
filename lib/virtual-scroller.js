import { Scrollbar } from './scrollbar';
import { SizeManager } from './size-manager';
import { addResizeListener } from './resize-observer';

export class VirtualScroller {
  /**
   * @typedef {{itemCount: number, itemBuilder: function(number):Element, onRemoveItem?: function(number):void, itemSize?: number, bufferSize?: number, scrollPosition?: number, horizontal?: boolean}} VirtualScrollerParams
   */
  /**
   * @param {HTMLElement} element
   * @param {VirtualScrollerParams} params
   * @returns {VirtualScroller}
   */
  static builder(element, params) {
    return new VirtualScroller(element, params);
  }

  /**
   * @param {HTMLElement} viewportElement
   * @param {VirtualScrollerParams} params
   */
  constructor(viewportElement, params) {
    /**
     * @private
     * @type {HTMLElement}
     */
    this.viewportElement = viewportElement;
    /**
     * @private
     * @type {number}
     */
    this.itemCount = params.itemCount;
    /**
     * @private
     * @type {boolean}
     */
    this.horizontal = Boolean(params.horizontal);
    /**
     * @private
     * @type {function(number):void}
     */
    this.onRemoveItem = params.onRemoveItem;
    /**
     * @private
     * @type {function(number):Element}
     */
    this.itemBuilder = params.itemBuilder;
    /**
     * @private
     * @type {number}
     */
    this.bufferSize = params.hasOwnProperty('bufferSize') ? params.bufferSize : 1;
    /**
     * @private
     * @type {SizeManager}
     */
    this.sizeManager = SizeManager.builder(this.horizontal);
    /**
     * @private
     * @type {number}
     */
    this.expectedItemSize = params.itemSize || this.sizeManager.getAverageSize();
    /**
     * @private
     * @type {number}
     */
    this.expectedTotalSize = this.itemCount * this.expectedItemSize;
    /**
     * @private
     * @type {{}}
     */
    this.rendered = {};
    /**
     * @private
     * @type {{start: number, end: number}}
     */
    this.range = {start: 0, end: 0};
    /**
     * @private
     * @type {number}
     */
    this.prevScrollPosition = params.scrollPosition || 0;
    /**
     * @private
     * @type {number}
     */
    this.throttleTime = 50;

    /**
     * @private
     * @type {Scrollbar}
     */
    this.scrollbar = Scrollbar.builder(this.viewportElement, {
      horizontal: this.horizontal,
      scrollPosition: this.prevScrollPosition,
      totalSize: this.expectedTotalSize,
      scrollListener: () => this.onScroll()
    });
    this.scheduleSync();
  }

  /**
   * @private
   */
  onScroll() {
    const scrollPosition = this.scrollPosition();
    window.clearTimeout(this.scrollThrottlingId);
    if (Math.abs(scrollPosition - this.prevScrollPosition) > this.scrollbar.viewportSize) {
      // Throttle rendering and layout if user scroll too fast to improve scroll performance
      // We can stuck with this case when use scrollbar holder to change position
      this.scrollThrottlingId = setTimeout(() => {
        this.scheduleSync();
      }, this.throttleTime);
    } else {
      this.scheduleSync();
    }
    this.prevScrollPosition = scrollPosition;
  }

  /**
   * @private
   */
  scheduleSync() {
    this.syncId = this.syncId || window.requestAnimationFrame(() => {
      this.syncId = null;
      this.sync();
    });
  }

  /**
   * @private
   */
  sync() {
    this.render(this.createRangeForCurrentPosition());
  }

  /**
   * @private
   * @returns {{start: number, end: number}}
   */
  createRangeForCurrentPosition() {
    const scrollPosition = this.scrollPosition();
    const viewportSize = this.scrollbar.viewportSize;
    const bufferSize = this.bufferSize * viewportSize;
    const startOffset = Math.max(scrollPosition - bufferSize, 0);
    const endOffset = scrollPosition + viewportSize + bufferSize;

    let start = Math.floor(startOffset / this.expectedItemSize);
    for (let i = this.range.start; i <= this.range.end; i++) {
      if (
        this.rendered[i] &&
        this.rendered[i].offset + this.sizeManager.getHopefulSize(this.rendered[i]) > startOffset &&
        this.rendered[i].offset < endOffset) {
        start = i;
        break;
      }
    }

    let end = Math.ceil(endOffset / this.expectedItemSize) - 1;
    for (let i = this.range.end; i >= this.range.start; i--) {
      if (
        this.rendered[i] &&
        this.rendered[i].offset < endOffset &&
        this.rendered[i].offset >= startOffset) {
        end = i;
        break;
      }
    }

    // Use average item size to more precisely calculate how many items we should render
    // if expected item size failed and we have rendered items
    const averageItemSize = this.sizeManager.getAverageSize();
    const startElement = this.rendered[start];
    if (startElement && startElement.offset > startOffset) {
      start = start - Math.ceil((startElement.offset - startOffset) / averageItemSize);
    }

    const endElement = this.rendered[end];
    if (endElement && (endElement.offset + this.sizeManager.getHopefulSize(endElement)) < endOffset) {
      end = end + Math.ceil((endOffset - (endElement.offset + this.sizeManager.getHopefulSize(endElement))) / averageItemSize);
    }

    const maxIndex = this.itemCount - 1;
    return {
      start: Math.min(Math.max(start, 0), maxIndex),
      end: Math.max(Math.min(end, maxIndex), 0)
    };
  }

  /**
   * @private
   * @param {{start: number, end: number}} range
   */
  render(range) {
    const firstVisibleItemIndex = this.findFirstVisibleItemIndex();
    const addedElements = [];
    let documentFragment = document.createDocumentFragment();
    for (let i = range.start; i <= range.end; i++) {
      // Render elements so that preserving correct position in DOM tree
      // so elements with less index should go in the DOM first
      if (!this.rendered[i]) {
        const newElement = this.rendered[i] = this.createElement(i);
        addedElements.push(newElement);
        documentFragment.appendChild(newElement);
      } else if (documentFragment.firstChild) {
        this.viewportElement.insertBefore(documentFragment, this.rendered[i]);
        documentFragment = document.createDocumentFragment();
      }
    }
    this.viewportElement.appendChild(documentFragment);

    addedElements.forEach((element) => {
      addResizeListener(element, () => {
        this.sizeManager.remove(element);
        this.scheduleSync();
      });
    });

    // Remove elements which out of the range
    for (let i = this.range.start; i <= this.range.end; i++) {
      if ((i < range.start || i > range.end) && this.rendered[i]) {
        this.onRemoveItem && this.onRemoveItem(i);
        this.sizeManager.remove(this.rendered[i]);
        this.viewportElement.removeChild(this.rendered[i]);
        delete this.rendered[i];
      }
    }

    // Measure rendered elements sizes
    for (let i = range.start; i <= range.end; i++) {
      if (!this.sizeManager.has(this.rendered[i])) {
        this.sizeManager.measure(this.rendered[i]);
      }
    }

    // Layout elements
    // If we already have rendered elements we should try to position new
    // elements or re-layout previous after resize with offset related to previously rendered elements
    // this allows us to cover most popular case when user scroll from top to bottom and
    // back. But if user would start from some middle point we can end with some jumping
    // when reach the point where offset is negative
    if (this.rendered[firstVisibleItemIndex] && range.start < firstVisibleItemIndex) {
      let offset = this.rendered[firstVisibleItemIndex].offset;
      for (let i = (firstVisibleItemIndex - 1); i >= range.start; i--) {
        const renderedElement = this.rendered[i];
        offset = offset - this.sizeManager.getHopefulSize(renderedElement);
        this.positionElement(renderedElement, Math.max(offset, 0));
      }
    }

    // If we reach the first element and its offset bigger than 0
    // we should reset offset and correct scroll position
    // We can stuck with this case when user had narrow viewport
    // then scroll down so that we have removed this first element
    // and then make viewport bigger so because we don't correct
    // position on resize we should correct it here
    if (range.start === 0 && this.rendered[0].offset > 0) {
      this.rendered[0].offset = 0;
    }

    // If start element already positioned we should start from
    // this point otherwise calculate estimated offset
    let scrollCorrection = 0;
    let startElement = this.rendered[range.start];
    let offset = startElement && startElement.offset ? startElement.offset : range.start * this.expectedItemSize;
    for (let i = range.start; i <= range.end; i++) {
      const renderedElement = this.rendered[i];
      if (i === firstVisibleItemIndex) {
        scrollCorrection = offset - renderedElement.offset;
      }
      this.positionElement(renderedElement, offset);
      offset += this.sizeManager.getHopefulSize(renderedElement);
    }

    if (scrollCorrection) {
      this.scrollTo(this.scrollPosition() + scrollCorrection);
    }

    // Adjust scrollbar size
    const offsetMismatch = offset - (range.end * this.expectedItemSize);
    const maxScrollTop = this.scrollbar.totalSize - this.scrollbar.viewportSize;
    const maxIndex = this.itemCount - 1;
    if (this.scrollPosition() >= maxScrollTop &&
      (offset > this.scrollbar.totalSize || range.end < maxIndex)) {
      // Increase scroll height if we reach end but we still have items which
      // should be rendered
      this.scrollbar.updateTotalSize(this.expectedTotalSize + offsetMismatch);
    } else if (range.end === maxIndex) {
      // If this is the last element we should correct scroll height
      // because we can render more space then we need
      this.scrollbar.updateTotalSize(offset);
    }

    this.range = range;

    const checkRange = this.createRangeForCurrentPosition();
    if (checkRange.start !== range.start || checkRange.end !== range.end) {
      this.scheduleSync();
    }
  }

  /**
   * @private
   * @return {number} Returns first visible item index or -1 if we can not find first visible item
   */
  findFirstVisibleItemIndex() {
    const scrollPosition = this.scrollPosition();
    const index = Object.keys(this.rendered).find((i) => {
      const renderedElement = this.rendered[i];
      return renderedElement.offset <= scrollPosition && renderedElement.offset + this.sizeManager.getHopefulSize(renderedElement) > scrollPosition;
    });
    return index ? Number(index) : -1;
  }

  /**
   * @private
   * @param {number} i Element index
   * @returns {HTMLElement}
   */
  createElement(i) {
    const item = document.createElement('div');
    item.setAttribute('index', String(i));
    item.style.position = 'absolute';
    item.style[this.horizontal ? 'height' : 'width'] = '100%';
    item.appendChild(this.itemBuilder(i));
    return item;
  }

  /**
   * @private
   * @param {HTMLElement} renderedElement
   * @param {number} offset
   */
  positionElement(renderedElement, offset) {
    renderedElement.style[this.horizontal ? 'left' : 'top'] = this.scrollbar.calc(offset) + 'px';
    // @ts-ignore
    renderedElement.offset = offset;
  }

  /**
   * @public
   * @return {number}
   */
  scrollPosition() {
    return this.scrollbar.scrollPosition;
  }

  /**
   * @public
   * @param {number} position
   */
  scrollTo(position) {
    this.scrollbar.scrollTo(position);
  }

  /**
   * @public
   */
  destroy() {
    this.scrollbar.destroy();
    this.sizeManager = null;
    this.rendered = null;
    window.cancelAnimationFrame(this.syncId);
    window.clearTimeout(this.scrollThrottlingId);
    this.syncId = null;
    this.scrollThrottlingId = null;
  }

  /**
   * @public
   * @param {number} value
   */
  updateItemCount(value) {
    if (this.itemCount !== value) {
      this.itemCount = value;
      this.expectedTotalSize = this.itemCount * this.expectedItemSize;
      this.scrollbar.updateTotalSize(this.expectedTotalSize);
      this.scheduleSync();
    }
  }
}
