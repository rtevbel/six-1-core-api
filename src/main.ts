import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from './common/constants';
import { ensureDefinedConfigParam } from './common/functions';

//import { v4 as uuidv4 } from 'uuid';

/**
 * Application bootstart function contains all the,
 * application's initial configurations
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService: ConfigService = app.get(ConfigService);

  //Get all required message broker params using ConfigService class
  const brokerUsername: string = ensureDefinedConfigParam(
    configService.get<string>(MESSAGE_BROKER_USERNAME_KEY),
    MESSAGE_BROKER_USERNAME_KEY,
  );

  const brokerPassword: string = ensureDefinedConfigParam(
    configService.get<string>(MESSAGE_BROKER_PASSWORD_KEY),
    MESSAGE_BROKER_PASSWORD_KEY,
  );

  const brokerHost: string = ensureDefinedConfigParam(
    configService.get<string>(MESSAGE_BROKER_HOST_KEY),
    MESSAGE_BROKER_HOST_KEY,
  );
  const brokerPort: number = ensureDefinedConfigParam(
    configService.get<number>(MESSAGE_BROKER_PORT_KEY),
    MESSAGE_BROKER_PORT_KEY,
  );
  let brokerUrl: string = ensureDefinedConfigParam(
    configService.get<string>(MESSAGE_BROKER_URL_KEY),
    MESSAGE_BROKER_URL_KEY,
  );
  const serviceMessageBrokerQueueName = ensureDefinedConfigParam(
    configService.get<string>(SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY),
    SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
  );

  //Make final messag broker url to pass in connectMicroservice's options object.
  brokerUrl +=
    brokerUsername + ':' + brokerPassword + '@' + brokerHost + ':' + brokerPort;

  //Create a microservice using RABBITMQ as transport layer
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [brokerUrl],
      queue: serviceMessageBrokerQueueName,
      queueOptions: {
        durable: false,
      },
    },
  });

  // Polyfill for crypto module to support,
  if (typeof crypto === 'undefined') {
    global.crypto = require('crypto');
  }

  //Start all connected microservices
  await app.startAllMicroservices();

  /**
   * Initialise application to enable the ,
   * usage of onModuleInit and onApplicationBootstrap,
   * life cycle hooks
   */
  app.init();

  /*
   * By uncommenting the below line we can start a HTTP server,
   * to make this application hybrid.
   */
  //await app.listen(3000, '0.0.0.0');
}

bootstrap();
