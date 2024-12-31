import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://ueshoprmqu:ueshoprmqp@rabbitmq:5672'],
      queue: 'user-service-dev-mysql',
      queueOptions: {
        durable: false,
      },
    },
  });

  await app.startAllMicroservices();
  //await app.listen(3000, '0.0.0.0');
}

bootstrap();
