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
