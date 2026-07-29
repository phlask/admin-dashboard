import { createRequestHandler } from '@react-router/express';
import express from 'express';

const app = express();

app.disable('x-powered-by');

app.all('*', createRequestHandler({ build: () => import('./build/server/index.js') }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
