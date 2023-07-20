import got from 'got';
import { pick, mapKeys, camelCase } from 'lodash-es';
import { parse } from 'node-html-parser';
import Generic from './generic.js';
import { IncomingHttpHeaders } from 'http';

const URL_REGEX =
  /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/;

const EMBED_URL_REGEX = /https:\/\/([\w\.-]+\.)?figma\.com\/embed(.*)$/;

const OEMBED_URL = `https://www.figma.com/api/oembed`;

export default class Figma extends Generic {
  url: string;
  keys = [
    'title',
    'provider_name',
    'folder_name',
    'thumbnail_url',
    'thumbnail_height',
    'thumbnail_width',
  ];

  constructor(url: string) {
    console.log(`[FIGMA]: Initialized with url:`, url);
    super(url);
  }

  static isMatch(url: string) {
    return (
      new RegExp(URL_REGEX).test(url) || new RegExp(EMBED_URL_REGEX).test(url)
    );
  }

  static canEmbed(url: string, headers: IncomingHttpHeaders): boolean {
    return new RegExp(EMBED_URL_REGEX).test(url);
  }

  async fetchMeta() {
    const oembedUrl = new URL(OEMBED_URL);

    if (Figma.canEmbed(this.url, {})) {
      const fileUrl = new URL(this.url).searchParams.get('url');
      oembedUrl.search = `?url=${fileUrl}`;
      console.log(
        `[FIGMA]: Found embed url, fetching meta from ${decodeURIComponent(
          fileUrl
        )} instead.`
      );
    } else {
      oembedUrl.search = `?url=${this.url}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response: JSON = await got(oembedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'chronicle-bot/1.0',
        },
        resolveBodyOnly: true,
        responseType: 'json',
      });

      const meta = mapKeys(pick(response, this.keys), (_, k) => camelCase(k));

      let embedUrl = null;
      try {
        embedUrl =
          parse(response['html']).firstChild['attributes']['src'] || null;
        if (embedUrl) {
          meta['iframe'] = embedUrl;
        }
      } catch (error) {
        console.error(`Error while parsing html for embeddable url`, error);
      }

      return { ...meta, embedUrl };
    } catch (error) {
      console.error(error);
      return {};
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
