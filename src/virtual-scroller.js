import { SizeManager } from './size-manager';

const BUFFER = 0.2;

export class VirtualScroller {
  /**
   * @param {HTMLElement} node
   * @param {{itemBuilder: Function<HTMLElement>, itemCount: number}} params
   * @return {VirtualScroller}
   */
  static builder(node, params) {
    return new VirtualScroller(node, params);
  }

  /**
   * @param {HTMLElement} rootNode
   * @param {{itemBuilder: Function<HTMLElement>, itemCount: number}} params
   * @return {VirtualScroller}
   */
  constructor(rootNode, params) {
    this.rootNode = rootNode;
    this.itemBuilder = params.itemBuilder;
    this.itemCount = params.itemCount;
    this.sizeManager = new SizeManager();
    this.rendered = {};
    this.start = 0;
    this.end = 0;
    this.scroller = findScrollableAncestor(this.rootNode);
    this.runway = renderRunway(this.rootNode);

    (this.scroller === document.documentElement ? window : this.scroller)
      .addEventListener('scroll', () => this.scheduleSync());
    window.addEventListener('resize', () => {
      this.sizeManager.reset();
      this.scheduleSync();
    });

    this.scheduleSync();
  }

  scheduleSync() {
    if (this.syncRefId) {
      return;
    }

    this.syncRefId = window.requestAnimationFrame(() => {
      this.syncRefId = null;
      this.sync();
    });
  }

  sync() {
    const height = this.scroller.clientHeight;
    const buffer = height * BUFFER;
    const scrollTop = Math.max(this.scroller.scrollTop - this.rootNode.offsetTop, 0);
    const lowOffset = Math.max((scrollTop - buffer), 0);
    const highOffset = scrollTop + height + buffer;
    const averageSize = this.sizeManager.getAverageSize();
    const startIndex = Math.max(Math.floor(lowOffset / averageSize), 0);
    const endIndex = Math.min(Math.ceil(highOffset / averageSize), this.itemCount) - 1;

    let fragment = document.createDocumentFragment();
    for (let i = startIndex; i <= endIndex; i++) {
      if (!this.rendered[i]) {
        const itemNode = renderItem(i, this.itemBuilder);
        this.rendered[i] = itemNode;
        fragment.appendChild(itemNode);
      } else if (fragment.children.length) {
        this.rootNode.insertBefore(fragment, this.rendered[i]);
        fragment = document.createDocumentFragment();
      }
    }
    this.rootNode.appendChild(fragment);

    while (this.start < startIndex) {
      this.remove(this.start++);
    }

    while (this.end > endIndex) {
      this.remove(this.end--);
    }

    for (let i in this.rendered) {
      if (this.rendered.hasOwnProperty(i)) {
        const node = this.rendered[i];
        if (!this.sizeManager.has(node)) {
          this.sizeManager.measure(node);
        }
      }
    }

    let offset = startIndex * this.sizeManager.getAverageSize();
    for (let i in this.rendered) {
      if (this.rendered.hasOwnProperty(i)) {
        const node = this.rendered[i];
        node.style.transform = `translateY(${offset}px)`;
        offset += this.sizeManager.getHopefulSize(node);
      }
    }

    if ((endIndex < this.itemCount) && highOffset > offset) {
      this.scheduleSync();
      return;
    }

    this.start = startIndex;
    this.end = endIndex;
    if (averageSize !== this.sizeManager.getAverageSize()) {
      this.runway.style.transform = `translateY(${this.sizeManager.getAverageSize() * this.itemCount}px)`;
    }
  }

  /**
   * @param {number} index
   */
  remove(index) {
    if (this.rendered[index]) {
      const node = this.rendered[index];
      this.sizeManager.remove(node);
      this.rootNode.removeChild(node);
      delete this.rendered[index];
    }
  }
}

/**
 * @param {number} index
 * @param {Function<HTMLElement>} itemBuilder
 * @return {HTMLElement}
 */
function renderItem(index, itemBuilder) {
  const node = itemBuilder(index);
  node.style.position = 'absolute';
  node.style.left = node.style.right = '0px';
  return node;
}

/**
 * @param {HTMLElement} rootNode
 * @return {HTMLElement} Runway node
 */
function renderRunway(rootNode) {
  const runwayNode = document.createElement('div');
  runwayNode.style.width = runwayNode.style.height = '1px';
  runwayNode.style.position = 'absolute';
  runwayNode.style.transform = 'translate(0, 0)';
  rootNode.style.position = 'relative';
  rootNode.appendChild(runwayNode);
  return runwayNode;
}

/**
 * @param {HTMLElement} node
 * @return {HTMLElement}
 */
function findScrollableAncestor(node) {
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
