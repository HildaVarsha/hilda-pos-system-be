import serverlessExpress from '@codegenie/serverless-express';
import { createApp } from '../../app.js';
import type { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

const app = createApp();
// @ts-expect-error - serverless-express CJS/ESM interop issue with NodeNext moduleResolution
const serverlessApp = serverlessExpress({ app });

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  try {
    return await serverlessApp(event, context);
  } catch {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
