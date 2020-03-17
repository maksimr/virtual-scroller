![Test](https://github.com/maksimr/virtual-scroller/workflows/Test/badge.svg) [![GitHub deployments](https://img.shields.io/github/deployments/maksimr/virtual-scroller/github-pages)](https://maksimr.github.io/virtual-scroller/)
## Classes

<dl>
<dt><a href="#VirtualScroller">VirtualScroller</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#VirtualScrollerParams">VirtualScrollerParams</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="VirtualScroller"></a>

## VirtualScroller
**Kind**: global class  

* [VirtualScroller](#VirtualScroller)
    * [new VirtualScroller(viewportElement, params)](#new_VirtualScroller_new)
    * _instance_
        * [.findFirstVisibleItemIndex()](#VirtualScroller+findFirstVisibleItemIndex) ⇒ <code>number</code>
        * [.scrollPosition()](#VirtualScroller+scrollPosition) ⇒ <code>number</code>
        * [.scrollTo(position)](#VirtualScroller+scrollTo)
        * [.destroy()](#VirtualScroller+destroy)
        * [.updateItemCount(value)](#VirtualScroller+updateItemCount)
    * _static_
        * [.builder(element, params)](#VirtualScroller.builder) ⇒ [<code>VirtualScroller</code>](#VirtualScroller)

<a name="new_VirtualScroller_new"></a>

### new VirtualScroller(viewportElement, params)

| Param | Type |
| --- | --- |
| viewportElement | <code>Element</code> | 
| params | [<code>VirtualScrollerParams</code>](#VirtualScrollerParams) | 

<a name="VirtualScroller+findFirstVisibleItemIndex"></a>

### virtualScroller.findFirstVisibleItemIndex() ⇒ <code>number</code>
Return first visible item index

**Kind**: instance method of [<code>VirtualScroller</code>](#VirtualScroller)  
**Returns**: <code>number</code> - Returns -1 if we can not find first visible item  
<a name="VirtualScroller+scrollPosition"></a>

### virtualScroller.scrollPosition() ⇒ <code>number</code>
**Kind**: instance method of [<code>VirtualScroller</code>](#VirtualScroller)  
**Access**: public  
<a name="VirtualScroller+scrollTo"></a>

### virtualScroller.scrollTo(position)
**Kind**: instance method of [<code>VirtualScroller</code>](#VirtualScroller)  
**Access**: public  

| Param | Type |
| --- | --- |
| position | <code>number</code> | 

<a name="VirtualScroller+destroy"></a>

### virtualScroller.destroy()
**Kind**: instance method of [<code>VirtualScroller</code>](#VirtualScroller)  
**Access**: public  
<a name="VirtualScroller+updateItemCount"></a>

### virtualScroller.updateItemCount(value)
**Kind**: instance method of [<code>VirtualScroller</code>](#VirtualScroller)  
**Access**: public  

| Param | Type |
| --- | --- |
| value | <code>number</code> | 

<a name="VirtualScroller.builder"></a>

### VirtualScroller.builder(element, params) ⇒ [<code>VirtualScroller</code>](#VirtualScroller)
**Kind**: static method of [<code>VirtualScroller</code>](#VirtualScroller)  

| Param | Type |
| --- | --- |
| element | <code>Element</code> | 
| params | [<code>VirtualScrollerParams</code>](#VirtualScrollerParams) | 

<a name="VirtualScrollerParams"></a>

## VirtualScrollerParams : <code>Object</code>
**Kind**: global typedef  
