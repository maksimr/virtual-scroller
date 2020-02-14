export class VirtualScroller {
  static builder(node, params = {}) {
    return new VirtualScroller(node, params);
  }

  constructor(rootNode, params) {
    this.rootNode = rootNode;
    this.params = params;
    this.renderedItems = {};
    this.start = 0;
    this.end = 0;
    this.scroller = this.rootNode;
    while (
      this.scroller.parentNode &&
      this.scroller.parentNode !== document) {
      const overflow = window.getComputedStyle(this.scroller).overflow;
      if (overflow === 'visible' || overflow === '') {
        this.scroller = this.scroller.parentNode;
        continue;
      }
      break;
    }

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
    this.runway.style.transform = `translateY(${this.placeholderSize *
    this.params.itemCount}px)`;

    for (let i in this.renderedItems) {
      this.renderedItems[i].height = null;
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
      this.unmount(this.start++);
    }

    while (this.end > end) {
      this.unmount(this.end--);
    }

    for (let i in this.renderedItems) {
      const item = this.renderedItems[i];
      if (item.height === null) {
        item.height = item.node.offsetHeight;
      }
    }

    let offset = start * this.placeholderSize;
    for (let i in this.renderedItems) {
      const item = this.renderedItems[i];
      item.node.style.transform = `translateY(${offset}px)`;
      offset += item.height;
    }

    this.start = start;
    this.end = end;
  }

  buildItem(id) {
    const node = this.params.itemBuilder(id);

    if (!node) {
      return null;
    }

    node.style.position = 'absolute';
    node.style.left = node.style.right = '0px';
    this.renderedItems[id] = {
      node: node,
      height: null
    };

    if (window.MutationObserver) {
      const observer = new MutationObserver(() => {
        this.onResize();
      });
      observer.observe(node, {characterData: true, childList: true, subtree: true});
      this.renderedItems[id].observer = observer;
    }

    return node;
  }

  unmount(id) {
    if (this.renderedItems[id]) {
      const item = this.renderedItems[id];
      if (item.observer) {
        item.observer.disconnect();
      }
      this.rootNode.removeChild(item.node);
      delete this.renderedItems[id];
    }
  }
}
