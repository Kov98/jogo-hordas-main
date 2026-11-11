const assert = require('node:assert/strict');

// The caller owns the browser, viewport, and authenticated game. Keep the real
// admin dialog open on its game tab before calling this helper.
module.exports = async function checkAdminLayout(page) {
  const dialog = page.getByRole('dialog').last();
  const body = dialog.locator('.portal-dialog-body');
  const viewport = page.viewportSize();
  const buttons = [
    dialog.getByRole('button', { name: 'Adicionar XP', exact: true }),
    dialog.getByRole('button', { name: 'Recuperar toda a vida', exact: true }),
    dialog.getByRole('button', { name: /^(Ligar|Desligar) invencibilidade$/ }),
    dialog.getByRole('button', { name: /^(Pausar|Retomar) hordas$/ }),
    dialog.getByRole('button', { name: 'Limpar inimigos e projéteis', exact: true }),
    dialog.getByRole('button', { name: 'Pular para o chefe', exact: true }),
    dialog.getByRole('button', { name: 'Derrotar o chefe', exact: true })
  ];
  const results = [];
  const originalScroll = await body.evaluate(el => el.scrollTop);
  try {
    for (const button of buttons) {
      await button.evaluate(el => {
        const scroller = el.closest('.portal-dialog-body');
        const box = scroller.getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(scroller).paddingBottom);
        // Leave the complete button inside the scrollport near its lower edge.
        // A sticky empty status used to cover its lower half in this position.
        scroller.scrollTop += el.getBoundingClientRect().bottom - (box.bottom - padding - 2);
      });
      const measured = await button.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const scroller = el.closest('.portal-dialog-body');
        const bodyRect = scroller.getBoundingClientRect();
        const status = el.closest('[role="dialog"]').querySelector('.admin-status');
        const statusRect = status.getBoundingClientRect();
        const style = getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const textRect = range.getBoundingClientRect();
        const points = [rect.top + 3, (rect.top + rect.bottom) / 2, rect.bottom - 3];
        const covering = points.map(y => {
          const hit = document.elementFromPoint((rect.left + rect.right) / 2, y);
          return el === hit || el.contains(hit) ? null : hit?.className || hit?.tagName || 'outside viewport';
        }).filter(Boolean);
        return {
          label: el.textContent, height: rect.height, textHeight: textRect.height,
          contentHeight: rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) -
            parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth),
          fullyInside: rect.top >= bodyRect.top && rect.bottom <= bodyRect.bottom &&
            rect.left >= bodyRect.left && rect.right <= bodyRect.right,
          covering, overflowX: scroller.scrollWidth - scroller.clientWidth,
          status: { text: status.textContent, height: statusRect.height, top: statusRect.top, bottom: statusRect.bottom },
          top: rect.top, bottom: rect.bottom
        };
      });
      const context = JSON.stringify({ viewport, ...measured });
      assert(measured.height >= 42, 'Admin action collapsed below its usable height: ' + context);
      assert(measured.textHeight <= measured.contentHeight + 1, 'Admin action text is clipped: ' + context);
      assert(measured.fullyInside, 'Admin action cannot be fully scrolled into view: ' + context);
      assert.equal(measured.covering.length, 0, 'Admin action is covered by another element: ' + context);
      assert(measured.overflowX <= 1, 'Admin dialog has an unexpected horizontal scrollbar: ' + context);
      results.push(measured);
    }
    const feedback = await dialog.locator('.admin-status').evaluate(el => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
      return { text: el.textContent.trim(), visible: rect.height > 0 && rect.top >= 0 &&
        rect.bottom <= window.innerHeight && (hit === el || el.contains(hit)) };
    });
    assert(!feedback.text || feedback.visible, 'Admin feedback disappeared while scrolling: ' + JSON.stringify(feedback));
    return { viewport, actions: results.length, feedback, results };
  } finally {
    await body.evaluate((el, scrollTop) => { el.scrollTop = scrollTop; }, originalScroll);
  }
};
