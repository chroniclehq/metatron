import express, { Request } from 'express';
import got from 'got';
import { isEmpty } from 'lodash-es';
import { parse } from 'node-html-parser';
import CacheManager from '../services/cache.js';
import { isValidUrl } from '../utils/index.js';

function findOEmbedUrl(html: string) {
  const ast = parse(html);
  const linkTag = ast.querySelector(
    'link[rel="alternate"][type="application/json+oembed"]'
  );
  return linkTag.attrs['href'];
}

async function resolveOEmbed(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const oembedResponse = await got(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'chronicle-bot/1.0',
      },
      resolveBodyOnly: true,
      responseType: 'json',
    });
    const iframe = parse(oembedResponse['html'])?.querySelector('iframe');
    const embedUrl = iframe.attrs['src'];

    return isValidUrl(embedUrl) ? embedUrl : null;
  } catch (error) {
    console.error(error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function probe(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await got(url, {
      signal: controller.signal,
      throwHttpErrors: false,
      headers: {
        'User-Agent': 'chronicle-bot/1.0',
      },
    });
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

type QueryParams = {
  url: string;
};

const EmbedRouter = express.Router();

EmbedRouter.get(
  '/check',
  async (req: Request<{}, {}, {}, QueryParams>, res) => {
    const { url } = req.query;

    if (!isValidUrl(url)) res.status(500).end();

    const data = { allowed: false, url: url };

    try {
      const probeResponse = await probe(url);

      if (probeResponse.ok) {
        if (isEmpty(probeResponse.headers['x-frame-options'])) {
          data['allowed'] = true;
        } else {
          const oEmbedUrl = findOEmbedUrl(probeResponse.body);
          const iframeUrl = await resolveOEmbed(oEmbedUrl);

          if (!isEmpty(iframeUrl)) {
            data['allowed'] = true;
            data['url'] = iframeUrl;
          }
        }
        CacheManager.getInstance().set('embed', url, JSON.stringify(data));
        res.status(200).json(data);
      } else {
        res.status(200).json(data);
      }
    } catch {
      res.status(200).json(data);
    }
  }
);

EmbedRouter.get(
  '/iframe',
  async (req: Request<{}, {}, {}, QueryParams>, res) => {
    const { url } = req.query;

    if (!isValidUrl(url)) res.status(500).end();

    try {
      const response = await probe(url);

      if (response.ok) {
        const oEmbedUrl = findOEmbedUrl(response.body);
        const iframeUrl = await resolveOEmbed(oEmbedUrl);

        if (!isEmpty(iframeUrl)) {
          res.status(200).json({ url: iframeUrl });
        } else {
          res.status(500).end();
        }
      } else {
        res.status(500).end();
      }
    } catch (error) {
      res.status(500).end();
    }
  }
);

export default EmbedRouter;
