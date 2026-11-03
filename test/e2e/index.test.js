import {test, expect} from '@playwright/test';

test.describe('VirtualScroller', () => {
  test('should render items', async ({page}) => {
    await openTestPage(page);
    await expect(page).toHaveScreenshot();
  });

  test('should render only one item', async ({page}) => {
    await openTestPage(page, {itemCount: 1});
    await expect(page).toHaveScreenshot();
  });

  test('should scroll to the bottom', async ({page}) => {
    await openTestPage(page);
    await scrollToBottom(page);
    // Wait util we render item and do scroll correction
    // because actual items size is bigger than expected
    // so we should jump on the top to add extra scroll space
    // for possibility to scroll at the last item
    await waitForItem(page, '2999998');
    await scrollToBottom(page);

    await expect(page).toHaveScreenshot();
  });

  test('should re-layout items after resize', async ({page}) => {
    await openTestPage(page);
    await page.setViewportSize({width: 400, height: 600});
    await expect(page).toHaveScreenshot();
  });

  test('should render items for passed scroll top', async ({page}) => {
    await openTestPage(page, {scrollPosition: 300});
    await expect(page).toHaveScreenshot();
  });

  test('should use window scroll', async ({page}) => {
    await openTestPage(page, {window: true, bufferSize: 1});
    await scrollTo(page, 300, true);
    await expect(page).toHaveScreenshot();
  });

  test('should render items horizontally', async ({page}) => {
    await openTestPage(page, {horizontal: true});
    await expect(page).toHaveScreenshot();
  });

  test('should scroll horizontally', async ({page}) => {
    await openTestPage(page, {horizontal: true});
    await scrollTo(page, 16000, false, true);
    await expect(page).toHaveScreenshot();
  });

  async function openTestPage(page, params = {itemCount: 3000000}) {
    const serializedConfig = encodeURIComponent(JSON.stringify(params));
    await page.goto(`/?${serializedConfig}`);
  }

  async function scrollToBottom(page) {
    await scrollTo(page, Infinity);
  }

  async function waitForItem(page, index) {
    await page.waitForSelector(`[index="${index}"]`);
  }

  async function scrollTo(page, scrollTop, isWindow = false, isHorizontal = false) {
    await page.evaluate(([scrollTop, isWindow, isHorizontal]) => {
      const scrollElement = isWindow ? document.documentElement : document.getElementById('app');
      if (isHorizontal) {
        scrollElement.scrollLeft = isFinite(scrollTop) ? scrollTop : scrollElement.scrollWidth;
      } else {
        scrollElement.scrollTop = isFinite(scrollTop) ? scrollTop : scrollElement.scrollHeight;
      }
    }, [scrollTop, isWindow, isHorizontal]);
  }
});
