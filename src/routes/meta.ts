import express, { Request } from 'express';
import { isValidUrl } from '../utils/index.js';
import Figma from '../adapters/figma.js';
import Generic from '../adapters/generic.js';
import Twitter from '../adapters/twitter.js';

const router = express.Router();

const providers = [Figma, Twitter, Generic];

type QueryParams = {
  url: string;
  force: boolean;
};

router.get('/', async (req: Request<{}, {}, {}, QueryParams>, res) => {
  const { url } = req.query;
  if (!isValidUrl(url)) res.status(500).end();
  let meta = {};

  const provider = providers.find((p) => p.isMatch(url));
  meta = await new provider(url).fetchMeta();
  res.status(200).json(meta);
});

export default router;
