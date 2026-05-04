import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();
    const status   = exception.getStatus();
    const raw      = exception.getResponse();

    const message =
      typeof raw === 'string'
        ? raw
        : (raw as any).message ?? exception.message;

    response.status(status).json({
      statusCode: status,
      error:      HttpStatus[status] ?? 'Error',
      message,
      timestamp:  new Date().toISOString(),
      path:       request.url,
    });
  }
}
