import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, tap, throwError, type Observable } from 'rxjs';
import type { RequestWithContext } from './request-context.middleware';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const startedAt = Date.now();
    const base = {
      requestId: request.requestId,
      userId: request.user?.clerkUserId,
      method: request.method,
      path: request.path,
    };

    return next.handle().pipe(
      tap(() =>
        this.logger.log(
          JSON.stringify({
            ...base,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
          }),
        ),
      ),
      catchError((error: unknown) => {
        this.logger.warn(
          JSON.stringify({
            ...base,
            statusCode: response.statusCode >= 400 ? response.statusCode : 500,
            durationMs: Date.now() - startedAt,
            outcome: 'error',
          }),
        );
        return throwError(() => error);
      }),
    );
  }
}
