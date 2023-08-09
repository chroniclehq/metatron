import got from 'got';
import { pick, mapKeys, camelCase } from 'lodash-es';
import { parse } from 'node-html-parser';
import Generic from './generic.js';
import { IncomingHttpHeaders } from 'http';
import { FigmaMetadata } from '../types.js';

export default class Figma extends Generic {
  private static keys = [
    'title',
    'provider_name',
    'folder_name',
    'thumbnail_url',
  ];
  private static URL_REGEX =
    /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/;
  private static EMBED_URL_REGEX =
    /https:\/\/([\w\.-]+\.)?figma\.com\/embed(.*)$/;
  private static OEMBED_URL = `https://www.figma.com/api/oembed`;

  constructor(url: string) {
    console.log(`[FIGMA]: Initialized with url:`, url);
    super(url);
  }

  static isMatch(url: string) {
    return (
      new RegExp(Figma.URL_REGEX).test(url) ||
      new RegExp(Figma.EMBED_URL_REGEX).test(url)
    );
  }

  static canEmbed(url: string, headers: IncomingHttpHeaders): boolean {
    return new RegExp(Figma.EMBED_URL_REGEX).test(url);
  }

  async fetchMeta() {
    const oembedUrl = new URL(Figma.OEMBED_URL);

    if (Figma.canEmbed(this.url, {})) {
      // In case the embed-url is directly sent, take the actual url and
      // fetch meta for that
      const fileUrl = new URL(this.url).searchParams.get('url')!;
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
      const response: Record<string, string> = await got(oembedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'chronicle-bot/1.0',
        },
        resolveBodyOnly: true,
        responseType: 'json',
      });

      const meta: FigmaMetadata = mapKeys(pick(response, Figma.keys), (_, k) =>
        camelCase(k)
      );

      try {
        const embedHtml: string = response.html;
        const embedUrl: string | null =
          (parse(embedHtml).firstChild as any)['attributes']['src'] || null;
        if (embedUrl) {
          meta['iframe'] = embedUrl;
        }
      } catch (error) {
        console.error(`Error while parsing html for embeddable url`, error);
      }

      return meta;
    } catch (error) {
      console.error(error);
      return {};
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
