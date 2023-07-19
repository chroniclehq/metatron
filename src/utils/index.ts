import got from 'got';
import { IncomingHttpHeaders } from 'http';
import { isEmpty } from 'lodash-es';
import { parse } from 'node-html-parser';

export async function probe(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await got(url, {
      signal: controller.signal,
      throwHttpErrors: false,
      headers: {
        'User-Agent': 'chronicle-bot/1.0',
      },
    });
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const fetchFavicon = async (url: string) => {
  const faviconUrl = new URL(url).origin + '/favicon.ico';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  return await got(faviconUrl, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'chronicle-bot/1.0',
    },
  })
    .then((res) => {
      clearTimeout(timeoutId);
      if (
        res.statusCode === 200 &&
        res.headers['content-type'].startsWith('image/')
      ) {
        return faviconUrl;
      } else return null;
    })
    .catch(() => {
      return null;
    });
};

export const extractMeta = (html: string) => {
  const ast = parse(html);

  const metaTags = ast.querySelectorAll('meta').map(({ attributes }) => {
    const property = attributes.property || attributes.name || attributes.href;
    return {
      property,
      content: attributes.content,
    };
  });

  const title = ast.querySelector('title')?.innerText;
  const linkTags = ast.querySelectorAll('link').map(({ attributes }) => {
    const { rel, href } = attributes;
    return {
      rel,
      href,
    };
  });

  return { title, metaTags, linkTags };
};

export function findOEmbedUrl(html: string) {
  const ast = parse(html);
  const linkTag = ast.querySelector(
    'link[rel="alternate"][type="application/json+oembed"]'
  );
  return linkTag?.attrs['href'];
}

export async function resolveOEmbed(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const oembedResponse = await got(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'chronicle-bot/1.0',
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });
    const iframe = parse(oembedResponse['html'])?.querySelector('iframe');
    const embedUrl = iframe.attrs['src'];

    return isValidUrl(embedUrl) ? embedUrl : null;
  } catch (error) {
    console.error(error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

const X_FRAME_OPTIONS = 'x-frame-options';
const CONTENT_SECURITY_POLICY = 'content-security-policy';

export function allowsEmbed(headers: IncomingHttpHeaders) {
  // XframeOptions should either be not set or be '*'
  // (wildcard is non-standard but miro uses it)
  // Move this to the adapter level so that we have more control with what we allow
  const hasXFrameOpt =
    !isEmpty(headers[X_FRAME_OPTIONS]) && headers[X_FRAME_OPTIONS] !== '*';

  // If CSP exists check if there is a frame-ancestors setting. frame-ancestors works like
  // x-frame-opt: DENY or ALLOW-ORIGIN so assume it is blocked if this exists.
  const hasFrameCSP = headers[CONTENT_SECURITY_POLICY]
    ? headers[CONTENT_SECURITY_POLICY].includes('frame-ancestors')
    : false;

  const isAllowed = !hasXFrameOpt && !hasFrameCSP;

  if (!isAllowed) {
    console.debug({ hasFrameCSP, hasXFrameOpt });
  }

  return isAllowed;
}

export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const getRelativeAssetUrl = (url: string, assetUrl: string) => {
  if (!assetUrl) {
    return null;
  }
  if (isValidUrl(assetUrl)) {
    return assetUrl;
  }
  const { protocol, host } = new URL(url);
  const baseURL = `${protocol}//${host}`;
  return new URL(assetUrl, baseURL).toString();
};

export function processRegexStrings(input: string): string | RegExp {
  if (input.startsWith('/'))
    return new RegExp(input.substring(1, input.length - 1));
  else return input;
}

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(
  (o) => processRegexStrings(o)
) || [
  'http://localhost:3000',
  'http://localhost:4000',
  'https://beta.chroniclehq.com',
  'https://staging.chroniclehq.com',
  'https://staging.h.chroniclehq.com',
  'https://h.chroniclehq.com',
  'https://studio.apollographql.com',
];
