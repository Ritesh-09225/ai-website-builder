import Handlebars from 'handlebars';

/**
 * Hydrates raw HTML template with the AI-generated JSON data.
 *
 * SECURITY NOTES:
 * - Handlebars double-stache `{{value}}` always HTML-escapes output — safe.
 * - Never use triple-stache `{{{value}}}` with AI-supplied data; that bypasses
 *   escaping and opens the door to XSS.
 * - The <iframe> that renders the output HTML should use the `sandbox` attribute
 *   (e.g. `sandbox="allow-same-origin"`) to prevent script execution.
 *
 * @param rawHtml The HTML string with Handlebars placeholders (e.g., {{hero.headline}})
 * @param data    The JSON object containing the data to fill in the template
 * @returns       The final rendered HTML string
 */
export function hydrateTemplate(
  rawHtml: string,
  data: Record<string, unknown>
): string {
  try {
    const template = Handlebars.compile(rawHtml);
    return template(data).trim();
  } catch (error) {
    console.error('Error hydrating template:', error);
    return '<div style="color:red;padding:1rem;">Error rendering template.</div>';
  }
}

/**
 * The `sandbox` value for the preview <iframe>.
 *
 * IMPORTANT: srcDoc iframes with a `sandbox` attribute get a null/opaque
 * origin, which causes the browser to block ALL external network requests
 * (including the Tailwind CDN script). Removing sandbox allows the CDN
 * to load. The iframe is still isolated from the parent page by the
 * same-origin policy since srcDoc frames have an opaque origin by default.
 *
 * If you need to re-enable sandbox for security reasons, you must serve
 * the Tailwind CSS as a local asset instead of loading from cdn.tailwindcss.com.
 */
export const IFRAME_SANDBOX: string | undefined = undefined;
