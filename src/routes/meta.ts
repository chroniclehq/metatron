import express, { Request } from 'express';
import Figma from '../adapters/figma.js';
import Generic from '../adapters/generic.js';
import Twitter from '../adapters/twitter.js';
import CacheManager from '../services/cache.js';
import { isValidUrl } from '../utils/index.js';

const router = express.Router();

const providers = [Figma, Twitter, Generic];

type QueryParams = {
  url: string;
  force: boolean;
};

router.get('/', async (req: Request<{}, {}, {}, QueryParams>, res) => {
  const { url } = req.query;

  if (!isValidUrl(url)) res.status(500).end();

  const provider = providers.find((p) => p.isMatch(url));

  try {
    const meta = await new provider(url).fetchMeta();

    CacheManager.getInstance().set(url, JSON.stringify(meta));

    res.status(200).json(meta);
  } catch (error) {
    res.status(500).end();
  }
});

export default router;
