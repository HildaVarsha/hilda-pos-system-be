// import type { CorsOptions } from 'cors';
// import { env } from './env.js';

// const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

// export const corsOptions: CorsOptions = {
//   origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
//     // Allow requests with no origin (e.g. curl, mobile apps, same-origin)
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//       return;
//     }
//     callback(new Error(`CORS: Origin ${origin} is not allowed`));
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// };
import type { CorsOptions } from 'cors';
import { env } from './env.js';

const allowedOrigins = [
  ...env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  'http://localhost:5173',
];

export const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
