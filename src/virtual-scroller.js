export class VirtualScroller {
  /**
   * @typedef {{itemBuilder: Function<HTMLElement>, itemCount: number}} VirtualScrollerConfig
   */
  /**
   * @typedef {{node: HTMLElement, height: <number|null>, observer: MutationObserver=}} VirtualItem
   */
  /**
   * @param {HTMLElement} node
   * @param {VirtualScrollerConfig} params
   * @return {VirtualScroller}
   */
  static builder(node, params) {
    return new VirtualScroller(node, params);
  }

  /**
   * @param {HTMLElement} rootNode
   * @param {VirtualScrollerConfig} params
   * @return {VirtualScroller}
   */
  constructor(rootNode, params) {
    this.rootNode = rootNode;
    this.params = params;
    /** @type {Object.<string, VirtualItem>} */
    this.renderedItems = {};
    this.start = 0;
    this.end = 0;
    this.scroller = this._findScrollableNode(this.rootNode);

    if (!this.params.hasOwnProperty('itemCount')) {
      throw Error('itemCount is required');
    }

    if (!this.params.hasOwnProperty('itemBuilder')) {
      throw Error('itemBuilder is required');
    }

    this.runway = document.createElement('div');
    this.runway.style.width = this.runway.style.height = '1px';
    this.runway.style.position = 'absolute';
    this.runway.style.transform = 'translate(0, 0)';

    this.rootNode.style.position = 'relative';
    this.rootNode.appendChild(this.runway);

    (this.scroller === document.documentElement ? window : this.scroller)
      .addEventListener('scroll', () => this.onScroll());
    window.addEventListener('resize', () => this.onResize());

    this.onResize();
  }

  onResize() {
    const placeholder = this.params.itemBuilder(this.start);
    placeholder.style.visibility = 'hidden';
    this.rootNode.appendChild(placeholder);
    this.placeholderSize = placeholder.offsetHeight;
    this.rootNode.removeChild(placeholder);
    this.runway.style.transform = `translateY(${this.placeholderSize * this.params.itemCount}px)`;

    for (let i in this.renderedItems) {
      if (this.renderedItems.hasOwnProperty(i)) {
        this.renderedItems[i].height = null;
      }
    }

    this.performLayout();
  }

  onScroll() {
    this.performLayout();
  }

  performLayout() {
    const scrollTop = Math.max((this.scroller.scrollTop - this.rootNode.offsetTop), 0);
    const start = Math.floor(scrollTop / this.placeholderSize);
    const height = this.scroller.clientHeight;
    const visible = Math.floor(height / this.placeholderSize);
    this.fill(start, start + visible);
  }

  /**
   * @param {number} start
   * @param {number} end
   */
  fill(start, end) {
    start = Math.max(start, 0);
    end = Math.min(end, this.params.itemCount);

    const fragment = document.createDocumentFragment();
    for (let i = start; i <= end; i++) {
      if (!this.renderedItems[i]) {
        const itemNode = this.buildItem(i);
        if (!itemNode) {
          break;
        }
        fragment.appendChild(itemNode);
      }
    }
    this.rootNode.appendChild(fragment);

    while (this.start < start) {
      this.removeItem(this.start++);
    }

    while (this.end > end) {
      this.removeItem(this.end--);
    }

    for (let i in this.renderedItems) {
      if (this.renderedItems.hasOwnProperty(i)) {
        const item = this.renderedItems[i];
        if (item.height === null) {
          item.height = item.node.offsetHeight;
        }
      }
    }

    let offset = start * this.placeholderSize;
    for (let i in this.renderedItems) {
      if (this.renderedItems.hasOwnProperty(i)) {
        const item = this.renderedItems[i];
        item.node.style.transform = `translateY(${offset}px)`;
        offset += item.height;
      }
    }

    if (
      (end < this.params.itemCount) &&
      (start * this.placeholderSize + this.scroller.clientHeight) > offset) {
      const newAverageSize = (offset - start * this.placeholderSize) / ((end + 1) - start);
      const adjustment = Math.ceil(((start * this.placeholderSize + this.scroller.clientHeight) - offset) / newAverageSize);
      this.fill(start, end + adjustment);
      return;
    }

    this.start = start;
    this.end = end;
  }

  /**
   * @param {number} index
   * @return {HTMLElement}
   */
  buildItem(index) {
    const node = this.params.itemBuilder(index);

    if (!node) {
      return null;
    }

    node.style.position = 'absolute';
    node.style.left = node.style.right = '0px';
    this.renderedItems[index] = {
      node: node,
      height: null
    };

    if (window.MutationObserver) {
      const observer = new MutationObserver(() => {
        this.onResize();
      });
      observer.observe(node, {characterData: true, childList: true, subtree: true});
      this.renderedItems[index].observer = observer;
    }

    return node;
  }

  /**
   * @param {number} index
   */
  removeItem(index) {
    if (this.renderedItems[index]) {
      const item = this.renderedItems[index];
      if (item.observer) {
        item.observer.disconnect();
      }
      this.rootNode.removeChild(item.node);
      delete this.renderedItems[index];
    }
  }

  /**
   * @param {HTMLElement} node
   * @return {HTMLElement}
   */
  _findScrollableNode(node) {
    while (
      node.parentNode &&
      node.parentNode !== document) {
      const overflow = window.getComputedStyle(node).overflow;
      if (overflow === 'visible' || overflow === '') {
        node = node.parentNode;
        continue;
      }
      break;
    }
    return node;
  }
}

