import { Scrollbar } from './scrollbar';
import { SizeManager } from './size-manager';
import { addResizeListener } from './resize-observer';

export class VirtualScroller {
  /**
   * @typedef {{itemCount: number, itemBuilder: function(number), onRemoveItem: function(number)=, itemSize: number=, bufferSize: number=, scrollTop: number=}} VirtualScrollerParams
   */
  /**
   * @param {Element} node
   * @param {VirtualScrollerParams} params
   * @returns {VirtualScroller}
   */
  static builder(node, params) {
    return new VirtualScroller(node, params);
  }

  /**
   * @param {Element} viewportNode
   * @param {VirtualScrollerParams} params
   */
  constructor(viewportNode, params) {
    this.viewportNode = viewportNode;
    this.itemCount = params.itemCount;
    this.onRemoveItem = params.onRemoveItem;
    this.itemBuilder = params.itemBuilder;
    this.bufferSize = params.hasOwnProperty('bufferSize') ? params.bufferSize : 1;
    this.sizeManager = SizeManager.build();
    this.expectedItemSize = params.itemSize || this.sizeManager.getAverageSize();
    this.expectedTotalSize = this.itemCount * this.expectedItemSize;
    this.rendered = {};
    this.range = {start: 0, end: 0};

    this.scrollbar = Scrollbar.build(this.viewportNode, {
      scrollTop: params.scrollTop || 0,
      totalSize: this.expectedTotalSize,
      scrollListener: () => this.sync()
    });
    this.scheduleSync();
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
    this.updateRenderedRange(this.calcRange());
  }

  /**
   * @private
   * @returns {{start: number, end: number}}
   */
  calcRange() {
    const scrollTop = this.scrollbar.scrollTop;
    const viewportSize = this.scrollbar.viewportSize;
    const bufferSize = this.bufferSize * viewportSize;
    const startOffset = Math.max(scrollTop - bufferSize, 0);
    const endOffset = scrollTop + viewportSize + bufferSize;

    let start = Math.floor(startOffset / this.expectedItemSize);
    let end = Math.ceil(endOffset / this.expectedItemSize) - 1;
    for (let i = this.range.start; i <= this.range.end; i++) {
      const renderedElement = this.rendered[i];
      if (renderedElement) {
        if (renderedElement && renderedElement.offset + this.sizeManager.getHopefulSize(renderedElement) > startOffset) {
          start = Math.min(i, start);
        }
        if (renderedElement.offset < endOffset) {
          end = i;
        }
      }
    }

    const startElement = this.rendered[start];
    if (startElement && startElement.offset > startOffset) {
      start = start - Math.ceil((startElement.offset - startOffset) / this.expectedItemSize);
    }

    const endElement = this.rendered[end];
    if (endElement && (endElement.offset + this.sizeManager.getHopefulSize(endElement)) < endOffset) {
      end = end + Math.ceil((endOffset - (endElement.offset + this.sizeManager.getHopefulSize(endElement))) / this.expectedItemSize);
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
  updateRenderedRange(range) {
    /**
     * Render elements so that preserving correct position in DOM tree
     * so elements with less index should go in the DOM first
     */
    const addedElements = [];
    let documentFragment = document.createDocumentFragment();
    for (let i = range.start; i <= range.end; i++) {
      if (!this.rendered[i]) {
        const newElement = this.rendered[i] = this.createElement(i);
        addedElements.push(newElement);
        documentFragment.appendChild(newElement);
      } else if (documentFragment.firstChild) {
        this.viewportNode.insertBefore(documentFragment, this.rendered[i]);
        documentFragment = document.createDocumentFragment();
      }
    }
    this.viewportNode.appendChild(documentFragment);

    addedElements.forEach((element) => {
      addResizeListener(element, () => {
        this.sizeManager.remove(element);
        this.scheduleSync();
      });
    });

    /**
     * Remove elements which out of the range
     */
    for (let i = this.range.start; i <= this.range.end; i++) {
      if ((i < range.start || i > range.end) && this.rendered[i]) {
        this.onRemoveItem && this.onRemoveItem(i, this.rendered[i]);
        this.sizeManager.remove(this.rendered[i]);
        this.viewportNode.removeChild(this.rendered[i]);
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
    /**
     * If we already have rendered elements we should try to position new
     * elements with offset related to previously rendered elements
     * this allows us to cover most popular case when user scroll from top to bottom and
     * back. But if user would start from some middle point we can end with some jumping
     * when reach the point where offset is negative
     */
    if (this.range.start > range.start && this.range.start <= range.end) {
      let offset = this.rendered[this.range.start].offset;
      for (let i = (this.range.start - 1); i >= range.start; i--) {
        const renderedElement = this.rendered[i];
        offset = offset - this.sizeManager.getHopefulSize(renderedElement);
        this.positionElement(renderedElement, Math.max(offset, 0));
      }

      // Negative offset means that we should correct scroll position
      // because we miss estimated offset for start items
      if (offset < 0) {
        this.scrollbar.scrollTo(this.scrollbar.scrollTop - offset);
      }
    }

    // If we reach the first element and its offset bigger than 0
    // we should reset offset and correct scroll position
    // We can stuck with this case when user had narrow viewport
    // then scroll down so that we have removed this first element
    // and then make viewport bigger so because we don't correct
    // position on resize we should correct it here
    if (range.start === 0 && this.rendered[0].offset > 0) {
      const offset = this.rendered[0].offset;
      this.rendered[0].offset = 0;
      this.scrollbar.scrollTo(this.scrollbar.scrollTop - offset);
    }

    /**
     * If start element already positioned we should start from
     * this point otherwise calculate estimated offset
     */
    let startElement = this.rendered[range.start];
    let offset = startElement && startElement.offset ? startElement.offset : range.start * this.expectedItemSize;
    for (let i = range.start; i <= range.end; i++) {
      const renderedElement = this.rendered[i];
      this.positionElement(renderedElement, offset);
      offset += this.sizeManager.getHopefulSize(renderedElement);
    }

    /**
     * Adjust scrollbar size
     */
    const offsetMismatch = offset - (range.end * this.expectedItemSize);
    if (offset > (this.expectedTotalSize - this.scrollbar.viewportSize)) {
      this.scrollbar.updateTotalSize(this.expectedTotalSize + offsetMismatch);
    }

    this.range = range;
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
    item.appendChild(this.itemBuilder(i));
    return item;
  }

  /**
   * @private
   * @param {HTMLElement} renderedElement
   * @param {number} offset
   */
  positionElement(renderedElement, offset) {
    renderedElement.style.top = this.scrollbar.calc(offset) + 'px';
    renderedElement.offset = offset;
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
    this.range = null;
    window.cancelAnimationFrame(this.syncId);
    this.syncId = null;
  }
}