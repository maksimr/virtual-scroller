import { VirtualScroller } from "./virtual-scroller";

describe("VirtualScroller", function() {
  let node;
  let params;
  beforeEach(function() {
    node = document.createElement("div");
    node.style.height = "100px";
    params = {
      itemCount: 10,
      itemBuilder(index) {
        const it = document.createElement("div");
        it.style.height = `${parseInt(node.style.height) / 10}px`;
        it.innerText = `${index}`;
        it.classList.add("item");
        return it;
      }
    };
  });

  it("should define service", function() {
    expect(VirtualScroller).toBeDefined();
  });

  it("should use position 'relative' for a passed node because we would render items relatively this node using position absolute", function() {
    VirtualScroller.builder(node, params);
    expect(node.style.position).toEqual("relative");
  });

  it("should render visible items", function() {
    VirtualScroller.builder(node, params);
    const items = node.querySelectorAll(".item");

    expect(items.length).toEqual(11);
    expect(items[0].style.transform).toEqual("translateY(0px)");
    expect(items[1].style.transform).toEqual(`translateY(${items[0].style.height})`);
  });

  it("should remove an item if it out of viewport after scroll", function() {
    VirtualScroller.builder(node, params);
    node.scrollTop = 10;
    node.dispatchEvent(new Event("scroll"));

    const items = node.querySelectorAll(".item");
    expect(items.length).toEqual(10);
    expect(items[0].innerText).toEqual("1");
  });

  it("should relayout items on resize", function() {
    VirtualScroller.builder(node, params);
    const items = node.querySelectorAll(".item");

    // emulate that first item has changed his height on resize
    items[0].style.height = "20px";
    window.dispatchEvent(new Event("resize"));

    expect(items[0].style.transform).toEqual("translateY(0px)");
    expect(items[1].style.transform).toEqual(`translateY(20px)`);
  });

  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    get() {
      return parseInt(this.style.height);
    }
  });
});
