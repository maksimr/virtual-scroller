const DEFAULT_HEIGHT_ESTIMATE_PX = 50;

export class SizeManager {
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
