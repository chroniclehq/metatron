import got from 'got';
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
        res.headers['content-type']?.startsWith('image/')
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
    const embedUrl = iframe?.attrs['src'];

    return embedUrl && isValidUrl(embedUrl) ? embedUrl : null;
  } catch (error) {
    console.error(error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
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

export function parseHeaderValue(input: string): Record<string, string[]> {
  const value: Record<string, string[]> = Object.fromEntries(
    input.split(';').map((v) => {
      const [key, ...values] = v.trim().split(' ');
      return [key, values];
    })
  );

  return value;
}
