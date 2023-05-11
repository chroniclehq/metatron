import Generic from './generic.js';

const URL_REGEX = /https:\/\/twitter.com\/(\S+)(status)\/(\S+)$/g;

export default class Twitter extends Generic {
  constructor(url: string) {
    console.log(`Fetching via twitter`);
    super(url);
  }
  static isMatch(url: string) {
    return new RegExp(URL_REGEX).test(url);
  }
  addAdditionalContext(data: any): any {
    return {
      isProfileImage: new RegExp(/profile_images/).test(data['og:image']),
    };
  }
}
