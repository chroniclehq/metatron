import Generic from './generic.js';

export default class Twitter extends Generic {
  addAdditionalContext(data: any): any {
    return {
      isProfileImage: new RegExp(/profile_images/).test(data['og:image']),
    };
  }
}
