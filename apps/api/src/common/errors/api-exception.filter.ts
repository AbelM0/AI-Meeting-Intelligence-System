import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { ApiErrorResponse } from '@meeting-intelligence/types';
import { AppError } from './app-error';
import type { RequestWithContext } from '../http/request-context.middleware';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<RequestWithContext>();
    const response = host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: ApiErrorResponse): void } }>();
    const statusCode =
      error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body: ApiErrorResponse = {
      statusCode,
      code: this.codeFor(error, statusCode),
      message: this.safeMessage(error, statusCode),
      requestId: request.requestId,
    };

    if (!(error instanceof HttpException) || statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          requestId: request.requestId,
          userId: request.user?.clerkUserId,
          method: request.method,
          path: request.path,
          statusCode,
          code: body.code,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        }),
        error instanceof Error ? error.stack : undefined,
      );
    }

    response.status(statusCode).json(body);
  }

  private codeFor(error: unknown, statusCode: number): string {
    if (error instanceof AppError) return error.code;
    if (error instanceof ThrottlerException || statusCode === 429) {
      return 'RATE_LIMITED';
    }
    return (
      {
        [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
        [HttpStatus.UNAUTHORIZED]: 'AUTHENTICATION_REQUIRED',
        [HttpStatus.FORBIDDEN]: 'ACCESS_DENIED',
        [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
        [HttpStatus.CONFLICT]: 'RESOURCE_CONFLICT',
        [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      }[statusCode] ?? 'INTERNAL_ERROR'
    );
  }

  private safeMessage(error: unknown, statusCode: number): string {
    if (error instanceof ThrottlerException || statusCode === 429) {
      return 'Too many requests. Please try again shortly.';
    }
    if (error instanceof AppError) return error.message;
    if (!(error instanceof HttpException) || statusCode >= 500) {
      return 'An unexpected error occurred. Please try again.';
    }

    const response = error.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = response.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
    }
    return error.message || 'The request could not be completed.';
  }
}
