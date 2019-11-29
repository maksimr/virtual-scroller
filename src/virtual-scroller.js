export class VirtualScroller {
  static builder(node, params = {}) {
    return new VirtualScroller(node, params);
  }

  constructor(scroller, params) {
    this.scroller = scroller;
    this.params = params;
    this.renderedItems = {};

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

    this.scroller.style.position = 'relative';
    this.scroller.appendChild(this.runway);

    this.scroller.addEventListener('scroll', this.onScroll.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    this.onResize();
  }

  onResize() {
    const placeholder = this.params.itemBuilder();
    placeholder.style.visibility = 'hidden';
    this.scroller.appendChild(placeholder);
    this.placeholderSize = placeholder.offsetHeight;
    this.scroller.removeChild(placeholder);
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
    const start = Math.floor(this.scroller.scrollTop / this.placeholderSize);
    const visible = Math.floor(
      this.scroller.offsetHeight / this.placeholderSize
    );
    this.fill(start, start + visible);
  }

  fill(start, end) {
    start = Math.max(start, 0);
    end = Math.min(end, this.params.itemCount);

    const fragment = document.createDocumentFragment();
    for (let i = start; i <= end; i++) {
      if (!this.renderedItems[i]) {
        fragment.appendChild(this.buildItem(i));
      }
    }
    this.scroller.appendChild(fragment);

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
    node.style.position = 'absolute';
    node.style.left = node.style.right = '0px';
    this.renderedItems[id] = {
      node: node,
      height: null
    };

    if (window.MutationObserver) {
      const observer = new MutationObserver(this.onResize.bind(this));
      observer.observe(node, {childList: true});
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
      this.scroller.removeChild(item.node);
      delete this.renderedItems[id];
    }
  }
}
