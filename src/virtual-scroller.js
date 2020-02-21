const BUFFER = 0.2;
const DEFAULT_HEIGHT_ESTIMATE_PX = 50;

class SizeManager {
  constructor() {
    this.reset();
  }

  /**
   * @param {!HTMLElement} element The element to measure.
   */
  has(element) {
    return this.sizes.has(element);
  }

  /**
   * Measures and stores |element|'s size. If |element| was measured
   * previously, this updates everything to use the new current size.
   * @param {!HTMLElement} element The element to measure.
   */
  measure(element) {
    let oldSize = this.sizes.get(element);
    if (oldSize === undefined) {
      oldSize = 0;
      this.measuredCount++;
    }
    const newSize = element.offsetHeight;
    this.totalMeasuredSize += newSize - oldSize;
    this.sizes.set(element, newSize);
  }

  /**
   * Returns a size for |element|, either the last stored size or an
   * estimate based on all other previously measured elements or a
   * default.
   * @param {!HTMLElement} element The element to produce a size for.
   */
  getHopefulSize(element) {
    const size = this.sizes.get(element);
    return size === undefined ? this.getAverageSize() : size;
  }

  getAverageSize() {
    return this.measuredCount > 0 ?
      this.totalMeasuredSize / this.measuredCount :
      DEFAULT_HEIGHT_ESTIMATE_PX;
  }

  /**
   * Removes all data related to |element| from the manager.
   * @param {!HTMLElement} element The element to remove.
   */
  remove(element) {
    const oldSize = this.sizes.get(element);
    if (oldSize === undefined) {
      return;
    }
    this.totalMeasuredSize -= oldSize;
    this.measuredCount--;
    this.sizes.delete(element);
  }

  reset() {
    this.sizes = new WeakMap();
    this.totalMeasuredSize = 0;
    this.measuredCount = 0;
  }
}

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
    this.rootNode.style.contain = 'strict';
    this.runway = renderRunway(this.rootNode);

    (this.scroller === document.documentElement ? window : this.scroller)
      .addEventListener('scroll', () => this.scheduleSync());
    window.addEventListener('resize', () => {
      this.sizeManager.reset();
      this.scheduleSync();
    });

    if (window.MutationObserver) {
      new MutationObserver((records) => {
        if (records.find((record) => record.target !== this.rootNode)) {
          this.scheduleSync();
        }
      }).observe(this.rootNode, {
        characterData: true, childList: true, subtree: true
      });
    }

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

    const renderedList = Object.keys(this.rendered);
    const offset = renderedList
      .map((it) => Number(it))
      .filter((it) => {
        if (it < startIndex || it > endIndex) {
          this.remove(it);
          return false;
        }
        return true;
      }).map((i) => {
        const node = this.rendered[i];
        if (!this.sizeManager.has(node)) {
          this.sizeManager.measure(node);
        }
        return node;
      }).reduce((offset, node) => {
        node.style.transform = `translateY(${offset}px)`;
        return offset + this.sizeManager.getHopefulSize(node);
      }, startIndex * this.sizeManager.getAverageSize());

    if (endIndex < (this.itemCount - 1) && highOffset > offset) {
      this.scheduleSync();
      return;
    }

    this.start = startIndex;
    this.end = endIndex;
    if (averageSize !== this.sizeManager.getAverageSize() || !this.runway.style.transform) {
      const newScrollHeight = this.sizeManager.getAverageSize() * this.itemCount;
      const prevScrollHeight = averageSize * this.itemCount;
      const delta = newScrollHeight / prevScrollHeight;
      this.runway.style.transform = `translateY(${newScrollHeight}px)`;
      if (this.scroller !== this.rootNode) {
        this.rootNode.style.height = `${newScrollHeight}px`;
      }
      this.scroller.scrollTop = this.scroller.scrollTop * delta;
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
