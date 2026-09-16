import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { isSafeUrl } from './security';

export interface UrlMetadata {
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
  author: string;
}

const TIMEOUT_MS = 8000;

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BOT_UA = 'facebookexternalhit/1.1 (+https://lifeos.app)';

const BOT_HOSTS = [
  'threads.com', 'threads.net',
  'twitter.com', 'x.com',
  'instagram.com',
  'facebook.com', 'fb.com',
  'linkedin.com',
  'tiktok.com',
];

function resolveUrl(base: string, path: string): string {
  if (!path) return '';
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('//')) return new URL(base).protocol + path;
    if (path.startsWith('/')) return new URL(base).origin + path;
    return new URL(path, base).toString();
  } catch {
    return '';
  }
}

function getHostname(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

function generateTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const cleaned = last
        .replace(/[-_]+/g, ' ')
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/\b\w/g, c => c.toUpperCase());
      if (cleaned.length > 3) return cleaned;
    }
    return u.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getMeta($: CheerioAPI, names: string[]): string {
  for (const name of names) {
    const el = $(`meta[${name}]`).first();
    const content = el.attr('content');
    if (content && content.trim()) return content.trim();
  }
  return '';
}

function findImage($: CheerioAPI): string {
  const candidates: string[] = [];

  $('meta').each((_, el) => {
    const prop = ($(el).attr('property') || '').toLowerCase();
    const name = ($(el).attr('name') || '').toLowerCase();
    const content = $(el).attr('content');
    if (!content || content.startsWith('data:') || content.length > 2000) return;
    if (prop === 'og:image' || prop === 'og:image:url' || prop === 'og:image:secure_url') candidates.push(content);
    if (name === 'twitter:image' || name === 'twitter:image:src' || name === 'twitter:image:url') candidates.push(content);
  });

  $('link[rel="image_src"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) candidates.push(href);
  });

  return candidates[0] || '';
}

function findFavicon($: CheerioAPI, baseUrl: string): string {
  const candidates: string[] = [];
  $('link[rel*="icon"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) candidates.push(href);
  });
  for (const c of candidates) if (c) return c;
  try {
    return `${new URL(baseUrl).origin}/favicon.ico`;
  } catch {
    return '';
  }
}

async function fetchHtml(url: string, userAgent: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) return null;
    return await response.text();
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

function parseHtmlMetadata(html: string, baseUrl: string): UrlMetadata | null {
  const $ = cheerio.load(html);

  const title = getMeta($, [
    'property="og:title"',
    'name="og:title"',
    'name="twitter:title"',
  ]) || $('title').first().text().trim();

  const description = getMeta($, [
    'property="og:description"',
    'name="og:description"',
    'name="twitter:description"',
    'name="description"',
  ]);

  const image = resolveUrl(baseUrl, findImage($));
  const favicon = resolveUrl(baseUrl, findFavicon($, baseUrl));

  const siteName = getMeta($, [
    'property="og:site_name"',
    'name="application-name"',
  ]) || getHostname(baseUrl);

  const author = getMeta($, [
    'name="author"',
    'property="article:author"',
    'name="twitter:creator"',
  ]);

  if (!title && !description && !image) return null;

  return {
    title: title.slice(0, 200),
    description: description.slice(0, 500),
    image: image.slice(0, 500),
    favicon: favicon.slice(0, 500),
    siteName: siteName.slice(0, 100),
    author: author.slice(0, 100),
  };
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const hostname = getHostname(url);

  if (!url || !isSafeUrl(url)) {
    return {
      title: url || '', description: '', image: '',
      favicon: '', siteName: hostname || '', author: ''
    };
  }

  const needsBotUA = BOT_HOSTS.some(h => hostname.includes(h));

  if (needsBotUA) {
    const botHtml = await fetchHtml(url, BOT_UA);
    if (botHtml) {
      const parsed = parseHtmlMetadata(botHtml, url);
      if (parsed) return parsed;
    }
  }

  const browserHtml = await fetchHtml(url, BROWSER_UA);
  if (browserHtml) {
    const parsed = parseHtmlMetadata(browserHtml, url);
    if (parsed) return parsed;
  }

  if (!needsBotUA) {
    const botHtml = await fetchHtml(url, BOT_UA);
    if (botHtml) {
      const parsed = parseHtmlMetadata(botHtml, url);
      if (parsed) return parsed;
    }
  }

  return {
    title: generateTitleFromUrl(url),
    description: '',
    image: '',
    favicon: `${new URL(url).origin}/favicon.ico`,
    siteName: hostname,
    author: '',
  };
}
