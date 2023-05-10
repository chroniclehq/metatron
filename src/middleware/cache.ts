import { NextFunction, Request, Response } from 'express';
import { isValidUrl } from '../utils/index.js';
import CacheManager from '../services/cache.js';

const CacheMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const url: string = req.query.url as string;

  if (isValidUrl(url)) {
    try {
      const data = await CacheManager.getInstance().get(url);
      if (data !== null) {
        console.log(`[cache]: Found data for ${url} in cache`);
        res.send(JSON.parse(data));
      } else {
        console.log(`[cache]: No data for ${url} in cache`);
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
