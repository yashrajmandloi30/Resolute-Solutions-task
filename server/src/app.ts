import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import studentRoutes from './routes/studentRoutes';
import { notFound, errorHandler } from './middleware/error';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', studentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
