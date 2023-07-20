import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import CacheMiddleware from './middleware/cache.js';
import MetaRouter from './routes/meta.js';
import CacheManager from './services/cache.js';
import { ALLOWED_ORIGINS } from './utils/index.js';

dotenv.config();

async function main() {
  CacheManager.getInstance().connect();

  const app: Express = express();
  const port = process.env.PORT;

  app.use(
    cors({
      origin: ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(CacheMiddleware);

  app.get('/health', (req: Request, res: Response) => {
    res.send('Metatron says Hi');
  });

  app.use('/meta', MetaRouter);

  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

async function shutdown() {
  console.log(`[server]: Shutting down services`);
  await CacheManager.getInstance().disconnect();
}

process.on('exit', async () => await shutdown());
process.on('SIGINT', async () => await shutdown());
process.on('uncaughtException', async (error) => {
  console.log('Uncaught Exception', JSON.stringify(error, null, 2));
  await shutdown();
});

main();
