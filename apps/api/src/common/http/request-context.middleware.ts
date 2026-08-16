import { Injectable, type NestMiddleware } from '@nestjs/common';
import { REQUEST_ID_HEADER, resolveRequestId } from './request-id';

export type RequestWithContext = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  path: string;
  ip?: string;
  socket: { remoteAddress?: string };
  requestId: string;
  user?: { clerkUserId?: string };
};

type ResponseWithHeaders = { setHeader(name: string, value: string): void };

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: ResponseWithHeaders, next: () => void): void {
    request.requestId = resolveRequestId(request.headers[REQUEST_ID_HEADER]);
    response.setHeader('X-Request-ID', request.requestId);
    next();
  }
}
