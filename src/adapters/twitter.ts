import Generic from './generic.js';

export default class Twitter extends Generic {
  constructor(url: string) {
    console.log(`Fetching via twitter`);
    super(url);
  }
  addAdditionalContext(data: any): any {
    return {
      isProfileImage: new RegExp(/profile_images/).test(data['og:image']),
    };
  }
}
