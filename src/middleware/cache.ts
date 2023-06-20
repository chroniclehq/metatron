import { NextFunction, Request, Response } from 'express';
import CacheManager from '../services/cache.js';
import { isValidUrl } from '../utils/index.js';

const CacheMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const url: string = req.query.url as string;

  if (isValidUrl(url)) {
    const route =
      req.path === '/meta'
        ? 'meta'
        : req.path === '/embed/check'
        ? 'embed'
        : null;

    if (!route) {
      return next();
    }
    try {
      const data = await CacheManager.getInstance().get(route, url);
      if (data !== null) {
        console.log(`[cache]: Found data for ${route}::${url} in cache`);
        res.send(JSON.parse(data));
      } else {
        console.log(`[cache]: No data for ${route}::${url} in cache`);
        next();
      }
    } catch (error) {
      console.error(`Error when trying to access redis:`, error);
      next();
    }
  } else {
    next();
  }
};

export default CacheMiddleware;
