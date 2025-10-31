import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ProcessInstancesService } from './process_instances.service';
import { ProcessInstancesController } from './process_instances.controller';
import { ProcessInstanceStepsModule } from './process_instance_steps/process_instance_steps.module';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { ensureDefinedConfigParam } from '../common/functions';
import { MESSAGE_BROKER_PROCESS_INSTANCE_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../common/constants';

/**
 * ProcessInstancesModule is responsible for managing process instances.
 * It includes the controller and service for handling operations
 * related to process instances and integrates various submodules for process instance management.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessInstanceEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessInstanceEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_PROCESS_INSTANCE_SERVICE_CLIENT_TOKEN,
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              ensureDefinedConfigParam(
                configService.get<string>(MESSAGE_BROKER_URL_KEY),
                MESSAGE_BROKER_URL_KEY,
              ) +
                ensureDefinedConfigParam(
                  configService.get<string>(MESSAGE_BROKER_USERNAME_KEY),
                  MESSAGE_BROKER_USERNAME_KEY,
                ) +
                ':' +
                ensureDefinedConfigParam(
                  configService.get<string>(MESSAGE_BROKER_PASSWORD_KEY),
                  MESSAGE_BROKER_PASSWORD_KEY,
                ) +
                '@' +
                ensureDefinedConfigParam(
                  configService.get<string>(MESSAGE_BROKER_HOST_KEY),
                  MESSAGE_BROKER_HOST_KEY,
                ) +
                ':' +
                ensureDefinedConfigParam(
                  configService.get<number>(MESSAGE_BROKER_PORT_KEY),
                  MESSAGE_BROKER_PORT_KEY,
                ),
            ],
            queue: configService.get(SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY),
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ProcessInstanceStepsModule, // Module for managing process instance steps
  ],
  controllers: [ProcessInstancesController],
  providers: [ProcessInstancesService],
  exports: [ProcessInstancesService],
})
export class ProcessInstancesModule {}
