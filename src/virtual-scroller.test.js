import { VirtualScroller } from './virtual-scroller';

describe('VirtualScroller', function() {
  const ITEM_CLASS_NAME = 'foo';
  const ITEM_SIZE = 1;
  let viewportNode;
  beforeEach(function() {
    viewportNode = document.createElement('div');
    spyOn(window, 'requestAnimationFrame').and.callFake((cb) => cb());
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

  function itemBuilder(id) {
    const itemNode = document.createElement('div');
    itemNode.setAttribute('id', id);
    itemNode.style.height = ITEM_SIZE;
    itemNode.classList.add(ITEM_CLASS_NAME);
    return itemNode;
  }

  function queryAllRenderedItems(rootNode) {
    return viewportNode.querySelectorAll('.' + ITEM_CLASS_NAME);
  }

  function scrollTo(node, scrollTop) {
    node.scrollTop = scrollTop;
    node.dispatchEvent(new Event('scroll'));
  }

  function defineProperty(node, propertyName, propertyValue) {
    Object.defineProperty(node, propertyName, {configurable: true, value: propertyValue});
  }
});