import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ProcessTemplateStepRequirementsService } from './process_template_step_requirements.service';
import { ProcessTemplateStepRequirementsController } from './process_template_step_requirements.controller';
import { ProcessTemplateStepRequirementEntity } from './entities/process_template_step_requirement.entity';

import { ensureDefinedConfigParam } from '../../../common/functions';
import { MESSAGE_BROKER_PROCESS_TEMPLATE_STEP_REQUIREMENT_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../../common/constants';

/**
 * ProcessTemplateStepRequirementsModule is responsible for managing process template step requirements.
 * It includes the controller and service for handling operations
 * related to process template step requirements.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateStepRequirementEntity for TypeORM.
    TypeOrmModule.forFeature([
      ProcessTemplateStepRequirementEntity,
    ]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_PROCESS_TEMPLATE_STEP_REQUIREMENT_SERVICE_CLIENT_TOKEN,
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
  ],
  controllers: [ProcessTemplateStepRequirementsController],
  providers: [ProcessTemplateStepRequirementsService],
})
export class ProcessTemplateStepRequirementsModule {}