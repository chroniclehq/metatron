export type URLMetadata = {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  iframe?: string;
};

export type FigmaApp = 'Figma' | 'FigJam'

export type FigmaMetadata = {
  title?: string;
  providerName?: FigmaApp;
  folderName?: string;
  thumbnailUrl?: string;
  iframe?: string;
};

export type TweetMetadata = {
  name?: string;
  username?: string;
  tweet?: string;
  media?: string;
  avatar?: string;
  favicon?: string;
  isProtected?: boolean;
}