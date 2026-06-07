/**
 * Print a fully self-contained HTML document in a hidden, off-screen iframe.
 *
 * Why an iframe (not window.print() on the page, nor window.open):
 *   • The output is a *dedicated* document — completely independent of the
 *     dashboard's DOM and Tailwind/global CSS. No "screenshot of the web page".
 *   • It reuses data already in memory (no extra fetch), so it works even though
 *     the access token lives only in memory (a fresh tab/window couldn't auth).
 *   • An iframe is never blocked by popup blockers, unlike window.open.
 */

const FRAME_ID = "se-print-frame";

export function printDocument(html: string): void {
  if (typeof document === "undefined") return;

  // Replace any frame left over from a previous (interrupted) print.
  document.getElementById(FRAME_ID)?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = FRAME_ID;
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);

  win.onafterprint = cleanup;

  // Let the written document lay out before invoking the print dialog. The
  // invoice uses only system fonts and no images, so a short tick is enough.
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      // If printing throws (e.g. blocked in a test env) still clean up.
    }
    // Fallback cleanup in case onafterprint never fires (some browsers).
    window.setTimeout(() => {
      if (document.getElementById(FRAME_ID)) iframe.remove();
    }, 60_000);
  }, 250);
}
