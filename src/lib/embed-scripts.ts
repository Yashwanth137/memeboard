/**
 * Embed script loader singleton utility.
 * Ensures external widget scripts (Twitter, Reddit, Instagram) are loaded
 * only once across the entire application and can be re-triggered reliably.
 */

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement | null) => Promise<void>;
        createTweet: (
          tweetId: string,
          targetEl: HTMLElement,
          options?: Record<string, any>
        ) => Promise<HTMLElement | null | undefined>;
      };
      ready: (callback: (twttr: any) => void) => void;
    };
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

let twitterScriptPromise: Promise<any> | null = null;
let instagramScriptPromise: Promise<any> | null = null;
let redditScriptPromise: Promise<void> | null = null;

/**
 * Loads Twitter / X widgets.js exactly once.
 */
export function loadTwitterWidgets(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window not available'));
  }

  if (window.twttr?.widgets) {
    return Promise.resolve(window.twttr);
  }

  if (!twitterScriptPromise) {
    twitterScriptPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Twitter widgets.js load timeout'));
      }, 6000);

      const existingScript = document.getElementById('twitter-wjs') as HTMLScriptElement | null;
      if (existingScript) {
        if (window.twttr?.widgets) {
          clearTimeout(timeout);
          return resolve(window.twttr);
        }
        existingScript.addEventListener('load', () => {
          clearTimeout(timeout);
          resolve(window.twttr);
        });
        existingScript.addEventListener('error', (e) => {
          clearTimeout(timeout);
          reject(e);
        });
        return;
      }

      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';

      script.onload = () => {
        clearTimeout(timeout);
        if (window.twttr?.ready) {
          window.twttr.ready((twttr) => resolve(twttr));
        } else {
          resolve(window.twttr);
        }
      };

      script.onerror = (err) => {
        clearTimeout(timeout);
        twitterScriptPromise = null;
        reject(err);
      };

      document.body.appendChild(script);
    });
  }

  return twitterScriptPromise;
}

/**
 * Creates an X / Twitter embed directly using twttr.widgets.createTweet.
 */
export async function createTwitterEmbed(
  tweetId: string,
  container: HTMLElement,
  options?: Record<string, any>
): Promise<HTMLElement | null> {
  const twttr = await loadTwitterWidgets();
  if (!twttr?.widgets?.createTweet) {
    throw new Error('Twitter widgets API not available');
  }

  const tweetElement = await twttr.widgets.createTweet(tweetId, container, {
    theme: 'dark',
    dnt: true,
    align: 'center',
    conversation: 'none',
    ...options,
  });

  return tweetElement || null;
}

/**
 * Loads Instagram embed.js exactly once.
 */
export function loadInstagramScript(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window not available'));
  }

  if (window.instgrm?.Embeds) {
    return Promise.resolve(window.instgrm);
  }

  if (!instagramScriptPromise) {
    instagramScriptPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Instagram embed.js load timeout'));
      }, 6000);

      const existing = document.getElementById('instagram-embed-script') as HTMLScriptElement | null;
      if (existing) {
        if (window.instgrm?.Embeds) {
          clearTimeout(timeout);
          return resolve(window.instgrm);
        }
        existing.addEventListener('load', () => {
          clearTimeout(timeout);
          resolve(window.instgrm);
        });
        existing.addEventListener('error', (e) => {
          clearTimeout(timeout);
          reject(e);
        });
        return;
      }

      const script = document.createElement('script');
      script.id = 'instagram-embed-script';
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;

      script.onload = () => {
        clearTimeout(timeout);
        resolve(window.instgrm);
      };

      script.onerror = (err) => {
        clearTimeout(timeout);
        instagramScriptPromise = null;
        reject(err);
      };

      document.body.appendChild(script);
    });
  }

  return instagramScriptPromise;
}

/**
 * Re-processes all Instagram blockquotes on the page.
 */
export async function processInstagramEmbeds(): Promise<void> {
  const instgrm = await loadInstagramScript();
  if (instgrm?.Embeds?.process) {
    instgrm.Embeds.process();
  }
}

/**
 * Loads Reddit embed script and triggers widget processing.
 */
export function loadRedditScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window not available'));
  }

  if (!redditScriptPromise) {
    redditScriptPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Reddit widgets.js load timeout'));
      }, 6000);

      const script = document.createElement('script');
      script.id = 'reddit-embed-script';
      script.src = 'https://embed.reddit.com/widgets.js';
      script.async = true;
      script.charset = 'UTF-8';

      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      script.onerror = (err) => {
        clearTimeout(timeout);
        redditScriptPromise = null;
        reject(err);
      };

      document.body.appendChild(script);
    });
  }

  return redditScriptPromise;
}

/**
 * Re-triggers Reddit embed processing by evaluating or appending the widget script.
 */
export function reprocessRedditEmbed(): void {
  if (typeof window === 'undefined') return;
  // Reddit's script executes immediately on querySelectorAll('.reddit-embed-bq')
  // To re-process dynamically mounted blockquotes, we inject an ephemeral trigger
  const script = document.createElement('script');
  script.src = 'https://embed.reddit.com/widgets.js';
  script.async = true;
  script.charset = 'UTF-8';
  script.onload = () => script.remove();
  document.body.appendChild(script);
}
