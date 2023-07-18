import express, { Request } from 'express';
import { isEmpty } from 'lodash-es';
import CacheManager from '../services/cache.js';
import {
  findOEmbedUrl,
  isValidUrl,
  probe,
  resolveOEmbed,
} from '../utils/index.js';

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
