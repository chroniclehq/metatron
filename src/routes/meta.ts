import express, { Request } from 'express';
import { isEmpty } from 'lodash-es';
import Figma from '../adapters/figma.js';
import Generic from '../adapters/generic.js';
import Twitter from '../adapters/twitter.js';
import CacheManager from '../services/cache.js';
import { isValidUrl } from '../utils/index.js';

const MetaRouter = express.Router();

const providers = [Figma, Twitter, Generic];

type QueryParams = {
  url: string;
  force: boolean;
};

MetaRouter.get('/', async (req: Request<{}, {}, {}, QueryParams>, res) => {
  const { url } = req.query;

  if (!isValidUrl(url)) res.status(500).end();

  const Provider = providers.find((p) => p.isMatch(url));

  try {
    const meta = await new Provider(url).fetchMeta();

    if (!isEmpty(meta)) {
      console.log(`[cache]: Saving data for ${url} in cache`);
      CacheManager.getInstance().set('meta', url, JSON.stringify(meta));
    }

    res.status(200).json(meta);
  } catch (error) {
    res.status(500).end();
  }
});

export default MetaRouter;
