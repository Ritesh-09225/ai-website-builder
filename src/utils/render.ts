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
    return template(data);
  } catch (error) {
    console.error('Error hydrating template:', error);
    return '<div style="color:red;padding:1rem;">Error rendering template.</div>';
  }
}

/**
 * The recommended `sandbox` value for the preview <iframe>.
 * `allow-same-origin` is required for Tailwind CDN styles loaded via <link>.
 * Remove `allow-scripts` if you want to fully block JavaScript in previews.
 */
export const IFRAME_SANDBOX = 'allow-same-origin allow-scripts' as const;
