import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import MetaRouter from './routes/meta.js';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.get('/', (req: Request, res: Response) => {
  res.send('Metatron says "Hi"');
});

app.use('/meta', MetaRouter);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
