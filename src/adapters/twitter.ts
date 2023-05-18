import Generic from './generic.js';
import { isEmpty } from 'lodash-es';

const URL_REGEX = /https?:\/\/twitter.com\/(\S+)\/(status)\/(\S+)$/g;

export default class Twitter extends Generic {
  constructor(url: string) {
    console.log(`Fetching via twitter`);
    super(url);
  }
  static isMatch(url: string) {
    return new RegExp(URL_REGEX).test(url);
  }
  addAdditionalContext(meta: any, raw: any): any {
    return {
      name: meta.title?.split(' on Twitter')[0],
      tweet: meta.description?.substring(1, meta.description.length - 1),
      username: new RegExp(URL_REGEX).exec(this.url)?.[1],
      isProtected: meta.title === 'Tweet / Twitter' && isEmpty(meta.image),
      isProfileImage: new RegExp(/profile_images/).test(raw['og:image']),
    };
  }
}
