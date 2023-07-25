import { isEmpty } from 'lodash-es';
import {
  extractMeta,
  fetchFavicon,
  findOEmbedUrl,
  getRelativeAssetUrl,
  isValidUrl,
  parseHeaderValue,
  probe,
  resolveOEmbed,
} from '../utils/index.js';
import { IncomingHttpHeaders } from 'http';
import {
  CONTENT_SECURITY_POLICY,
  FRAME_ANCESTORS,
  X_FRAME_OPTIONS,
} from '../utils/constants.js';

export default class Generic {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  static isMatch(url: string) {
    return isValidUrl(url);
  }

  static canEmbed(url: string, headers: IncomingHttpHeaders) {
    // XframeOptions should either be not set or be '*'
    // (wildcard is non-standard but miro uses it)
    // Move this to the adapter level so that we have more control with what we allow
    const isPremissiveXFrame =
      isEmpty(headers[X_FRAME_OPTIONS]) || headers[X_FRAME_OPTIONS] === '*';

    // If CSP exists check if there is a frame-ancestors setting. frame-ancestors works like
    // x-frame-opt: DENY or ALLOW-ORIGIN so assume it is blocked if this exists.
    let isPermissiveCSP = true;

    const hasFrameCSP = headers[CONTENT_SECURITY_POLICY]
      ? headers[CONTENT_SECURITY_POLICY].includes(FRAME_ANCESTORS)
      : false;

    if (hasFrameCSP) {
      const frameAncestors = (parseHeaderValue(
        headers[CONTENT_SECURITY_POLICY] as string
      ) || {})[FRAME_ANCESTORS].join().trim();

      isPermissiveCSP = frameAncestors === '*';
    }

    const isAllowed = isPremissiveXFrame && isPermissiveCSP;

    if (!isAllowed) {
      console.debug({ isPremissiveXFrame, isPermissiveCSP, hasFrameCSP });
    }

    return isAllowed;
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

      if (Generic.canEmbed(resolvedUrl, headers)) {
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

      return metadata;
    } catch (error) {
      console.error(error);
      return {};
    }
  }
}
