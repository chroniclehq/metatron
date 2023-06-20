import got from 'got';
import { parse } from 'node-html-parser';
import { getRelativeAssetUrl, isValidUrl } from '../utils/index.js';

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

export const fetchHtml = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout if it takes longer than 5 seconds
  return await got(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'chronicle-bot/1.0',
    },
  }).then((res) => {
    clearTimeout(timeoutId);
    return { html: res.body, url: res.url };
  });
};

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

export default class Generic {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  static isMatch(url: string) {
    return isValidUrl(url);
  }

  addAdditionalContext(meta: any, raw: any) {
    return {};
  }

  async fetchMeta() {
    try {
      const [{ html, url: resolvedUrl }, faviconUrl] = await Promise.all([
        fetchHtml(this.url),
        fetchFavicon(this.url),
      ]);

      const { metaTags, title: titleTag, linkTags } = extractMeta(html);

      let raw: any = {};

      for (let k in metaTags) {
        let { property, content } = metaTags[k];
        property && (raw[property] = content);
      }

      for (let m in linkTags) {
        let { rel, href } = linkTags[m];
        // Don't override existing properties because the first is
        // usually working.
        // TODO @harris is there a fast way to check if links are working?
        if (rel && !raw[rel]) {
          raw[rel] = href;
        }
      }

      const title = raw['og:title'] || raw['twitter:title'] || titleTag;

      const description =
        raw['description'] ||
        raw['og:description'] ||
        raw['twitter:description'];

      const image = raw['og:image'] || raw['twitter:image'] || raw['image_src'];

      const favicon = raw['icon'] || raw['shortcut icon'] || faviconUrl;

      const metadata = {
        title,
        description,
        image: getRelativeAssetUrl(resolvedUrl, image),
        favicon: getRelativeAssetUrl(resolvedUrl, favicon),
      };

      return Object.assign(metadata, this.addAdditionalContext(metadata, raw));
    } catch (error) {
      console.error(error);
      return {};
    }
  }
}
