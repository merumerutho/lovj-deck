/**
 * ctxPosition.js — compute fixed position for a context menu so it
 * stays within the viewport.
 *
 * Call anchorPoint(event) on right-click to get { x, y } for the
 * menu's CSS left/top.  Then after the menu is mounted, call
 * clampToViewport(menuEl, pos) to adjust if the rendered size
 * would overflow.
 */

/**
 * Pick which corner of the menu should sit at the cursor.
 * Returns initial { x, y } assuming the menu grows away from the
 * nearest edges.
 */
export function anchorPoint(event) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = event.clientX;
  const cy = event.clientY;

  return { x: cx, y: cy, _right: cx > vw / 2, _up: cy > vh / 2 };
}

/**
 * After the menu DOM node is rendered, measure it and flip/clamp
 * so nothing overflows.  Mutates the node's style in place.
 */
export function clampToViewport(menuEl, pos) {
  if (!menuEl) return;
  const rect = menuEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 6;

  let x = pos._right ? pos.x - rect.width : pos.x;
  let y = pos._up ? pos.y - rect.height : pos.y;

  x = Math.max(pad, Math.min(x, vw - rect.width - pad));
  y = Math.max(pad, Math.min(y, vh - rect.height - pad));

  menuEl.style.left = x + "px";
  menuEl.style.top = y + "px";
}
