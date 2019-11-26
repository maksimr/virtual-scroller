import { VirtualScroller } from "./virtual-scroller";

describe("VirtualScroller", function() {
  let node;
  beforeEach(function() {
    node = document.createElement("div");
  });

  it("should define service", function() {
    expect(VirtualScroller).toBeDefined();
  });

  it("should use position 'relative' for a passed node because we would render items relatively this node using position absolute", function() {
    VirtualScroller.builder(node, {
      itemCount: 10,
      placeholderBuilder() {
        return document.createElement("div");
      }
    });

    expect(node.style.position).toEqual("relative");
  });
});
