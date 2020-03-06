import { VirtualScroller } from './virtual-scroller';

describe('VirtualScroller', function() {
  const ITEM_CLASS_NAME = 'foo';
  const ITEM_SIZE = 1;
  let viewportNode;
  beforeEach(function() {
    Object.defineProperties(window.HTMLElement.prototype, {
      offsetLeft: {get: function() { return parseFloat(window.getComputedStyle(this).marginLeft) || 0; }},
      offsetTop: {get: function() { return parseFloat(window.getComputedStyle(this).marginTop) || 0; }},
      offsetHeight: {get: function() { return parseFloat(window.getComputedStyle(this).height) || (this.firstChild && this.firstChild.offsetHeight) || 0; }},
      offsetWidth: {get: function() { return parseFloat(window.getComputedStyle(this).width) || (this.firstChild && this.firstChild.offsetWidth) || 0; }}
    });
    spyOn(window, 'requestAnimationFrame').and.callFake((cb) => cb());
    viewportNode = document.createElement('div');
  });

  it('should create virtual scroller', function() {
    const virtualScroller = VirtualScroller.builder(viewportNode, {
      itemCount: 10,
      itemBuilder
    });
    expect(virtualScroller).toBeDefined();
  });

  it('should render items on viewport', function() {
    VirtualScroller.builder(viewportNode, {
      itemCount: 10,
      itemBuilder
    });

    expect(queryAllRenderedItems(viewportNode).length > 0).toEqual(true);
  });

  it('should render only visible items', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    defineProperty(viewportNode, 'clientHeight', VISIBLE_ITEMS_COUNT * ITEM_SIZE);

    VirtualScroller.builder(viewportNode, {
      bufferSize: 0,
      itemSize: ITEM_SIZE,
      itemCount: 100,
      itemBuilder
    });

    expect(queryAllRenderedItems(viewportNode).length).toEqual(VISIBLE_ITEMS_COUNT);
  });

  it('should render some items behind viewport in buffer zone', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    // bufferSize defined relative units based on viewport size:
    // 1 - 100%, 2 - 200%, 0.5 - 50% of viewport size
    const bufferSize = 1;
    const BUFFER_ITEMS_COUNT = bufferSize * viewportSize / ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);

    VirtualScroller.builder(viewportNode, {
      bufferSize: bufferSize,
      itemSize: ITEM_SIZE,
      itemCount: 100,
      itemBuilder
    });

    expect(queryAllRenderedItems(viewportNode).length).toEqual(VISIBLE_ITEMS_COUNT + BUFFER_ITEMS_COUNT);
  });

  it('should remove items out of the bounds', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);

    VirtualScroller.builder(viewportNode, {
      bufferSize: 0,
      itemSize: ITEM_SIZE,
      itemCount: 100,
      itemBuilder
    });

    // scroll down
    scrollTo(viewportNode, viewportSize);
    expect(queryAllRenderedItems(viewportNode).length).toEqual(VISIBLE_ITEMS_COUNT);
    expect((queryAllRenderedItems(viewportNode))[0].id).toEqual('5');

    // scroll up
    scrollTo(viewportNode, 0);
    expect(queryAllRenderedItems(viewportNode).length).toEqual(VISIBLE_ITEMS_COUNT);
    expect(queryAllRenderedItems(viewportNode)[4].id).toEqual('4');
  });

  it('should preserve right order in DOM when render items', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);

    VirtualScroller.builder(viewportNode, {
      bufferSize: 0,
      itemSize: ITEM_SIZE,
      itemCount: 100,
      itemBuilder
    });

    scrollTo(viewportNode, ITEM_SIZE);
    expect(queryAllRenderedItems(viewportNode)[0].id).toEqual('1');
    expect(queryAllRenderedItems(viewportNode)[4].id).toEqual('5');

    scrollTo(viewportNode, 0);
    expect(queryAllRenderedItems(viewportNode)[0].id).toEqual('0');
    expect(queryAllRenderedItems(viewportNode)[4].id).toEqual('4');
  });

  it('should correctly layout items when user scroll up if actual size more than expected', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    const ACTUAL_ITEM_SIZE = 2 * ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);

    VirtualScroller.builder(viewportNode, {
      scrollTop: 2 * ITEM_SIZE,
      bufferSize: 0,
      itemSize: ITEM_SIZE,
      itemCount: 100,
      itemBuilder: itemBuilderFactory(ACTUAL_ITEM_SIZE)
    });
    scroll(viewportNode);

    expect(queryAllRenderedItems(viewportNode)[0].id).toEqual('2');
    expect(offsetFor(queryAllRenderedItems(viewportNode)[0])).toEqual(2);

    scrollTo(viewportNode, 1);
    expect(queryAllRenderedItems(viewportNode)[0].id).toEqual('1');
    expect(offsetFor(queryAllRenderedItems(viewportNode)[0])).toEqual(1);
    expect(offsetFor(queryAllRenderedItems(viewportNode)[1])).toEqual(3);

    scrollTo(viewportNode, 0);
    expect(queryAllRenderedItems(viewportNode)[0].id).toEqual('0');
    expect(offsetFor(queryAllRenderedItems(viewportNode)[0])).toEqual(0);
    expect(offsetFor(queryAllRenderedItems(viewportNode)[1])).toEqual(2);
  });

  it('should not render more items if buffer already full because actual size more than expected', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    const ACTUAL_ITEM_SIZE = 2 * ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);

    VirtualScroller.builder(viewportNode, {
      bufferSize: 0,
      itemSize: ITEM_SIZE,
      itemCount: 100,
      itemBuilder: itemBuilderFactory(ACTUAL_ITEM_SIZE)
    });

    expect(queryAllRenderedItems(viewportNode).length).toEqual(3);

    scrollTo(viewportNode, ITEM_SIZE);
    expect(queryAllRenderedItems(viewportNode).length).toEqual(Math.ceil(viewportSize / ACTUAL_ITEM_SIZE));
  });

  it('should correctly define start index if actual size bigger than expected', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    const ACTUAL_ITEM_SIZE = 2 * ITEM_SIZE;
    let scrollTop = 50;
    defineProperty(viewportNode, 'clientHeight', viewportSize);

    VirtualScroller.builder(viewportNode, {
      bufferSize: 0,
      scrollTop: scrollTop,
      itemSize: ITEM_SIZE,
      itemCount: 100,
      itemBuilder: itemBuilderFactory(ACTUAL_ITEM_SIZE)
    });

    expect(queryAllRenderedItems(viewportNode).length).toEqual(3);

    scrollTo(viewportNode, scrollTop -= 2);
    scrollTo(viewportNode, scrollTop -= 2);
    scrollTo(viewportNode, scrollTop -= 2);
    scrollTo(viewportNode, scrollTop -= 2);
    scrollTo(viewportNode, scrollTop -= 2);
    scrollTo(viewportNode, scrollTop -= 2);
    scrollTo(viewportNode, scrollTop -= 2);
    expect(queryAllRenderedItems(viewportNode).length).toEqual(3);
  });

  it('should render more items if actual size smaller than expected', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    const AVERAGE_ITEM_SIZE = 2 * ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);

    VirtualScroller.builder(viewportNode, {
      bufferSize: 0,
      itemSize: AVERAGE_ITEM_SIZE,
      itemCount: 100,
      itemBuilder
    });

    expect(queryAllRenderedItems(viewportNode).length).toEqual(VISIBLE_ITEMS_COUNT);
  });

  it('should allow to update itemCount', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);
    const virtualScroller = VirtualScroller.builder(viewportNode, {
      itemSize: ITEM_SIZE,
      itemCount: 2,
      itemBuilder
    });

    expect(queryAllRenderedItems(viewportNode).length).toEqual(2);

    virtualScroller.updateItemCount(5);
    expect(queryAllRenderedItems(viewportNode).length).toEqual(5);
  });

  it('should correct scroll position if after resize first visible element has changed position', function() {
    // If after resize first visible element has changed position
    // we should correct the scroll to move it on the same visible place for user to prevent
    // visual jumping effect
    const VISIBLE_ITEMS_COUNT = 10;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);
    const scrollTop = viewportSize;
    VirtualScroller.builder(viewportNode, {
      itemSize: ITEM_SIZE,
      bufferSize: ITEM_SIZE / viewportSize,
      scrollTop: scrollTop,
      itemCount: 100,
      itemBuilder
    });

    const renderedElements = queryAllRenderedItems(viewportNode);
    const firstVisibleElement = renderedElements[1];
    expect(firstVisibleElement.id).toEqual(String(scrollTop / ITEM_SIZE));
    expect(viewportNode.scrollTop).toEqual(scrollTop);
    expect(offsetFor(firstVisibleElement)).toEqual(scrollTop);

    const firstRenderedElement = renderedElements[0];
    const prevSize = parseInt(firstRenderedElement.style.height);
    const newSize = 2 * prevSize;
    const newScrollTop = scrollTop + (newSize - prevSize);
    resize(firstRenderedElement, newSize);
    expect(viewportNode.scrollTop).toEqual(newScrollTop);
    expect(offsetFor(firstVisibleElement)).toEqual(newScrollTop);
  });

  it('should not correct scroll and focus on previous first visible item if user has jumped on considerable distance from last scroll position', function() {
    // For example user can drag scrollbar handler in this case we should reset anchor and don't apply scroll correction
    const VISIBLE_ITEMS_COUNT = 10;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);
    let scrollTop = viewportSize;
    VirtualScroller.builder(viewportNode, {
      itemSize: ITEM_SIZE,
      bufferSize: ITEM_SIZE / viewportSize,
      scrollTop: scrollTop,
      itemCount: 100,
      itemBuilder
    });

    scrollTo(viewportNode, scrollTop = 3 * scrollTop);
    expect((queryAllRenderedItems(viewportNode))[1].id).toEqual(String(scrollTop / ITEM_SIZE));
  });

  it('should correct scroll position and re-layout items if we reach first element but offset is negative because our assumption which was based on expected size was failed', function() {
    const VISIBLE_ITEMS_COUNT = 10;
    const ACTUAL_ITEM_SIZE = 2 * ITEM_SIZE;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    defineProperty(viewportNode, 'clientHeight', viewportSize);
    let scrollTop = 2 * ITEM_SIZE;
    VirtualScroller.builder(viewportNode, {
      itemSize: ITEM_SIZE,
      bufferSize: ITEM_SIZE / viewportSize,
      scrollTop: scrollTop,
      itemCount: 100,
      itemBuilder: itemBuilderFactory(ACTUAL_ITEM_SIZE)
    });

    expect((queryAllRenderedItems(viewportNode))[0].id).toEqual(String(1));
    expect(offsetFor((queryAllRenderedItems(viewportNode))[0])).toEqual(ITEM_SIZE);

    scrollTo(viewportNode, 0);
    expect((queryAllRenderedItems(viewportNode))[0].id).toEqual(String(0));
    expect(offsetFor((queryAllRenderedItems(viewportNode))[1])).toEqual(ACTUAL_ITEM_SIZE);
    expect(viewportNode.scrollTop).toEqual(1);
  });

  it('should allow use window as scroller for virtual scroll', function() {
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    document.body.appendChild(viewportNode);
    defineSizeFor(document.documentElement, viewportSize);
    VirtualScroller.builder(viewportNode, {
      itemSize: ITEM_SIZE,
      itemCount: 100,
      itemBuilder
    });

    expect(queryAllRenderedItems(viewportNode).length).toEqual(2 * (viewportSize / ITEM_SIZE));
  });

  it('should consider distance between viewport node and scroll node', function() {
    const scrollNode = document.documentElement;
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    document.body.appendChild(viewportNode);
    defineOffset(viewportNode, viewportSize);
    defineSizeFor(scrollNode, viewportSize);
    VirtualScroller.builder(viewportNode, {
      itemSize: ITEM_SIZE,
      bufferSize: 0,
      itemCount: 100,
      itemBuilder
    });

    expect(queryAllRenderedItems(viewportNode).length).toEqual((viewportSize / ITEM_SIZE));

    scrollTo(scrollNode, viewportSize);
    expect(queryAllRenderedItems(viewportNode)[0].id).toEqual('0');
    expect(queryAllRenderedItems(viewportNode).length).toEqual((viewportSize / ITEM_SIZE));
  });

  it('should correctly scroll to if scroll node has offset between viewport node', function() {
    const scrollNode = document.documentElement;
    const VISIBLE_ITEMS_COUNT = 5;
    const viewportSize = VISIBLE_ITEMS_COUNT * ITEM_SIZE;
    const offset = viewportSize;
    document.body.appendChild(viewportNode);
    defineOffset(viewportNode, offset);
    defineSizeFor(scrollNode, viewportSize);
    const virtualScroller = VirtualScroller.builder(viewportNode, {
      itemSize: ITEM_SIZE,
      bufferSize: 0,
      itemCount: 100,
      itemBuilder
    });

    scrollTo(scrollNode, 0);
    const scrollTop = 5;
    virtualScroller.scrollTo(scrollTop);
    scroll(scrollNode);

    expect(scrollNode.scrollTop).toEqual(offset + scrollTop);
  });

  function itemBuilder(id) {
    return itemBuilderFactory(ITEM_SIZE)(id);
  }

  function itemBuilderFactory(nodeSize) {
    return (id) => {
      const itemNode = document.createElement('div');
      itemNode.setAttribute('id', id);
      defineSizeFor(itemNode, nodeSize);
      itemNode.classList.add(ITEM_CLASS_NAME);
      return itemNode;
    };
  }

  function queryAllRenderedItems(rootNode) {
    return rootNode.querySelectorAll('.' + ITEM_CLASS_NAME);
  }

  function scrollTo(node, scrollTop) {
    node.scrollTop = scrollTop;
    scroll(node);
  }

  function scroll(node) {
    node.dispatchEvent(new Event('scroll'));
  }

  function offsetFor(node) {
    return node.parentNode.offset;
  }

  function resize(node, size) {
    defineSizeFor(node, size);
    const resizeObserverNode = node.parentNode.lastChild;
    scroll(resizeObserverNode);
  }

  function defineSizeFor(node, size) {
    if (node.style) {
      node.style.height = size + 'px';
    }
    defineProperty(node, 'offsetHeight', size);
    defineProperty(node, 'clientHeight', size);
  }

  function defineOffset(node, offset) {
    defineProperty(viewportNode, 'offsetTop', offset);
    if (!node.getBoundingClientRect.and) {
      spyOn(node, 'getBoundingClientRect');
    }
    node.getBoundingClientRect.and.returnValue({top: offset});
  }

  function defineProperty(node, propertyName, propertyValue) {
    Object.defineProperty(node, propertyName, {configurable: true, value: propertyValue});
  }
});