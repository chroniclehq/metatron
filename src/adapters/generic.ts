import { isEmpty } from 'lodash-es';
import {
  extractMeta,
  fetchFavicon,
  probe,
  getRelativeAssetUrl,
  isValidUrl,
  findOEmbedUrl,
  resolveOEmbed,
} from '../utils/index.js';

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
      const [{ body: html, url: resolvedUrl, headers }, faviconUrl] =
        await Promise.all([probe(this.url), fetchFavicon(this.url)]);

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

      if (isEmpty(headers['x-frame-options'])) {
        metadata['iframe'] = resolvedUrl;
      } else {
        const oEmbedUrl = findOEmbedUrl(html);
        if (oEmbedUrl) {
          const iframeUrl = await resolveOEmbed(oEmbedUrl);
          if (!isEmpty(iframeUrl)) {
            metadata['iframe'] = iframeUrl;
          }
        }
      }

      return Object.assign(metadata, this.addAdditionalContext(metadata, raw));
    } catch (error) {
      console.error(error);
      return {};
    }
  }
}
