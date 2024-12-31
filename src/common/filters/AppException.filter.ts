import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: any, host: ArgumentsHost) {
    const contextType = host.getType();

    if (contextType === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();

      const { httpAdapter } = this.httpAdapterHost;
      const httpStatusCode =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const responsBody = {
        statusCode: httpStatusCode,
        message: exception.message,
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(request),
      };
      return httpAdapter.reply(response, responsBody, httpStatusCode);
    } else if (contextType === 'rpc') {
      return new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: exception.message,
      });
    } else if (contextType === 'ws') {
      const ctx = host.switchToWs();
      const client = ctx.getClient();
      const data = ctx.getData();
      client.emit('error', { message: exception.message });
    }
  }
}
