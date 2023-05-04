import express, { Request } from 'express';
import got from 'got';
import { parse } from 'node-html-parser';
import { getRelativeAssetUrl, isValidUrl } from '../utils/index.js';

const fetchHtml = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout if it takes longer than 5 seconds
  return await got(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'chronicle-bot/1.0',
    },
  }).then((res) => {
    clearTimeout(timeoutId);
    return res.body;
  });
};

const extractMeta = (html: string) => {
  const ast = parse(html);
  const metaTags = ast.querySelectorAll('meta').map(({ attributes }) => {
    const property = attributes.property || attributes.name || attributes.href;
    return {
      property,
      content: attributes.content,
    };
  });
  const title = ast.querySelector('title')?.innerText;
  const linkTags = ast.querySelectorAll('link').map(({ attributes }) => {
    const { rel, href } = attributes;
    return {
      rel,
      href,
    };
  });

  return { title, metaTags, linkTags };
};

const getMetaTags = async (url: string) => {
  const html = await fetchHtml(url);
  const { metaTags, title: titleTag, linkTags } = extractMeta(html);

  let object: any = {};

  for (let k in metaTags) {
    let { property, content } = metaTags[k];

    property && (object[property] = content);
  }

  for (let m in linkTags) {
    let { rel, href } = linkTags[m];

    rel && (object[rel] = href);
  }

  const title = object['og:title'] || object['twitter:title'] || titleTag;

  const description =
    object['description'] ||
    object['og:description'] ||
    object['twitter:description'];

  const image =
    object['og:image'] ||
    object['twitter:image'] ||
    object['image_src'] ||
    object['icon'] ||
    object['shortcut icon'];

  return {
    title,
    description,
    image: getRelativeAssetUrl(url, image),
  };
};

const router = express.Router();

type QueryParams = {
  url: string;
  force: boolean;
};

router.get('/', async (req: Request<{}, {}, {}, QueryParams>, res) => {
  const { url } = req.query;
  if (!isValidUrl(url)) res.status(500).end();

  const metaJson = await getMetaTags(url);

  res.json(metaJson);
});

export default router;
