import { isEmpty } from 'lodash-es';
import { extractMeta, getRelativeAssetUrl, probe } from '../utils/index.js';
import Generic from './generic.js';

const URL_REGEX = /https?:\/\/twitter.com\/(\S+)\/(status)\/(\S+)$/g;
const AVATAR_REGEX = /profile_images/;

type ResolveImageOptions = {
  resolvedUrl: string;
  isProtected: boolean;
};

export default class Twitter extends Generic {
  constructor(url: string) {
    console.log(`Fetching via twitter`);
    super(url);
  }

  static isMatch(url: string) {
    return new RegExp(URL_REGEX).test(url);
  }

  addAdditionalContext(meta: any, raw: any): any {}

  async fetchProfile(username: string) {
    try {
      const { body: html } = await probe(`https://twitter.com/${username}`);
      const { metaTags } = extractMeta(html);
      let raw: any = {};
      for (let k in metaTags) {
        let { property, content } = metaTags[k];
        property && (raw[property] = content);
      }
      const isProfileImage = new RegExp(AVATAR_REGEX).test(raw['og:image']);
      if (isProfileImage) {
        return { avatar: raw['og:image'] };
      } else {
        return { avatar: null };
      }
    } catch (error) {
      console.error(error);
      return { avatar: null };
    }
  }

  async resolveImages(raw: any, options: ResolveImageOptions) {
    const image = raw['og:image'] || raw['twitter:image'] || raw['image_src'];
    const isProfileImage = new RegExp(AVATAR_REGEX).test(image);

    let avatar = null;
    let media = null;

    if (!isProfileImage) {
      if (!options.isProtected) {
        const username = new RegExp(URL_REGEX).exec(this.url)?.[1];
        avatar = (await this.fetchProfile(username)).avatar;
      }
      media = image ?? null;
    } else {
      avatar = image;
    }

    return {
      avatar: avatar ? getRelativeAssetUrl(options.resolvedUrl, avatar) : null,
      media: media ? getRelativeAssetUrl(options.resolvedUrl, media) : null,
    };
  }

  async fetchMeta() {
    try {
      const { body: html, url: resolvedUrl } = await probe(this.url);
      const { metaTags, title: titleTag, linkTags } = extractMeta(html);

      let raw: any = {};

      for (let k in metaTags) {
        let { property, content } = metaTags[k];
        property && (raw[property] = content);
      }

      for (let m in linkTags) {
        let { rel, href } = linkTags[m];
        // Don't override existing properties because the first is
        // usually working. TODO @harris is there a fast way to check
        // if links are working
        if (rel && !raw[rel]) {
          raw[rel] = href;
        }
      }

      const title = raw['og:title'] || raw['twitter:title'] || titleTag;
      const description =
        raw['description'] ||
        raw['og:description'] ||
        raw['twitter:description'];

      const favicon = raw['icon'] || raw['shortcut icon'] || null;

      const username = new RegExp(URL_REGEX).exec(this.url)?.[1];
      const isProtected: boolean =
        title === 'Tweet / Twitter' && isEmpty(description);

      const { media, avatar } = await this.resolveImages(raw, {
        resolvedUrl,
        isProtected,
      });

      const metadata = {
        username,
        favicon,
        name: isProtected ? null : title?.split(' on Twitter')[0],
        tweet: description?.substring(1, description.length - 1) ?? null,
        media,
        avatar,
        isProtected,
      };

      return Object.assign(metadata, this.addAdditionalContext(metadata, raw));
    } catch (error) {
      console.error(error);
      return {};
    }
  }
}
