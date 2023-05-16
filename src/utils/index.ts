export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const getRelativeAssetUrl = (url: string, assetUrl: string) => {
  if (!assetUrl) {
    return null;
  }
  if (isValidUrl(assetUrl)) {
    return assetUrl;
  }
  const { protocol, host } = new URL(url);
  const baseURL = `${protocol}//${host}`;
  return new URL(assetUrl, baseURL).toString();
};

export function processRegexStrings(input: string): string | RegExp {
  if (input.startsWith('/'))
    return new RegExp(input.substring(1, input.length - 1));
  else return input;
}

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(
  (o) => processRegexStrings(o)
) || [
  'http://localhost:3000',
  'http://localhost:4000',
  'https://beta.chroniclehq.com',
  'https://staging.chroniclehq.com',
  'https://staging.h.chroniclehq.com',
  'https://h.chroniclehq.com',
  'https://studio.apollographql.com',
];
