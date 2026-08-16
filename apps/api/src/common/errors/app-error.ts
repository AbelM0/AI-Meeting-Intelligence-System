import { HttpException, type HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    status: HttpStatus,
  ) {
    super(message, status);
  }
}
