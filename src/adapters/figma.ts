import got from 'got';
import { pick, mapKeys, camelCase } from 'lodash-es';

const URL_REGEX =
  /https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/;

const OEMBED_URL = `https://www.figma.com/api/oembed`;

export default class Figma {
  url: string;

  constructor(url: string) {
    console.log(`Fetching via Figma`);
    this.url = url;
  }

  static isMatch(url: string) {
    return new RegExp(URL_REGEX).test(url);
  }

  async fetchMeta() {
    const oembedUrl = new URL(OEMBED_URL);
    oembedUrl.search = `?url=${this.url}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const props = [
      'title',
      'provider_name',
      'folder_name',
      'thumbnail_url',
      'thumbnail_height',
      'thumbnail_width',
    ];

    try {
      const res: JSON = await got(oembedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'chronicle-bot/1.0',
        },
        resolveBodyOnly: true,
        responseType: 'json',
      });

      const meta = mapKeys(pick(res, props), (_, k) => camelCase(k));

      return meta;
    } catch (error) {
      console.error(error);
      return {};
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
