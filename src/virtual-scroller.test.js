import { VirtualScroller } from './virtual-scroller';

describe('VirtualScroller', function() {
  let node;
  let params;
  beforeEach(function() {
    const containerHeight = 100;
    node = document.createElement('div');
    node.style.height = `${containerHeight}px`;
    node.style.overflow = 'auto';
    document.body.appendChild(node);
    params = {
      itemCount: 10,
      itemBuilder(index) {
        const it = document.createElement('div');
        it.style.height = `${parseInt(containerHeight) / 10}px`;
        it.innerText = `${index}`;
        it.classList.add('item');
        return it;
      }
    };
  });

  it('should define service', function() {
    expect(VirtualScroller).toBeDefined();
  });

  it('should use position \'relative\' for a passed node because we would render items relatively this node using position absolute', function() {
    VirtualScroller.builder(node, params);
    expect(node.style.position).toEqual('relative');
  });

  it('should render visible items', function() {
    VirtualScroller.builder(node, params);
    const items = node.querySelectorAll('.item');

    expect(items.length).toEqual(11);
    expect(items[0].style.transform).toEqual('translateY(0px)');
    expect(items[1].style.transform).toEqual(`translateY(${items[0].style.height})`);
  });

  it('should remove an item if it out of viewport after scroll', function() {
    VirtualScroller.builder(node, params);
    scroll(node, 10);

    const items = node.querySelectorAll('.item');
    expect(items.length).toEqual(10);
    expect(items[0].innerText).toEqual('1');
  });

  it('should relayout items on resize', function() {
    VirtualScroller.builder(node, params);
    const items = node.querySelectorAll('.item');

    // emulate that first item has changed his height on resize
    items[0].style.height = '20px';
    window.dispatchEvent(new Event('resize'));

    expect(items[0].style.transform).toEqual('translateY(0px)');
    expect(items[1].style.transform).toEqual(`translateY(20px)`);
  });

  describe('documentElement', function() {
    beforeEach(function() {
      document.documentElement.style.height = node.style.height;
      node.style.height = 0;
      node.style.overflow = 'visible';
    });

    it('should take viewport size if scroller node does not specify height', function() {
      VirtualScroller.builder(node, params);
      const items = node.querySelectorAll('.item');

      expect(items.length).toEqual(11);
      expect(items[0].style.transform).toEqual('translateY(0px)');
      expect(items[1].style.transform).toEqual(`translateY(${items[0].style.height})`);
    });

    it('should render new items on viewport scroll', function() {
      VirtualScroller.builder(node, params);
      scroll(window, 10);

      const items = node.querySelectorAll('.item');
      expect(items.length).toEqual(10);
      expect(items[0].innerText).toEqual('1');
    });

    it('should consider offset between the root node and viewport', function() {
      document.body.style.paddingTop = '10px';
      Object.defineProperty(node, 'offsetTop', {get() { return 10; }});
      VirtualScroller.builder(node, params);

      const items = node.querySelectorAll('.item');
      expect(items.length).toEqual(11);
      expect(items[0].innerText).toEqual('0');
    });
  });

  function scroll(node, scrollTop) {
    (node === window ? document.documentElement : node).scrollTop = scrollTop;
    node.dispatchEvent(new Event('scroll'));
  }

  try {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      get() {
        return parseInt(this.style.height);
      }
    });

    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      get() {
        return parseInt(this.style.height);
      }
    });
  } catch (_) {
  }
});
