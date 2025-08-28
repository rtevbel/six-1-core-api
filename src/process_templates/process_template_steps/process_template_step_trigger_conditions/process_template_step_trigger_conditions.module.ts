import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

import { ProcessTemplateStepTriggerConditionsService } from './process_template_step_trigger_conditions.service';
import { ProcessTemplateStepTriggerConditionsController } from './process_template_step_trigger_conditions.controller';

import { ProcessTemplateStepTriggerConditionEntity } from './entities/process_template_step_trigger_condition.entity';

import { ensureDefinedConfigParam } from '../../../common/functions';
import { MESSAGE_BROKER_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../../common/constants';

/**
 * ProcessTemplateStepTriggerConditionsModule is responsible for managing
 * process template step trigger conditions. It includes the controller
 * and service for handling operations related to trigger conditions.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateStepTriggerConditionEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessTemplateStepTriggerConditionEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SERVICE_CLIENT_TOKEN,
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
  controllers: [ProcessTemplateStepTriggerConditionsController],
  providers: [ProcessTemplateStepTriggerConditionsService],
})
export class ProcessTemplateStepTriggerConditionsModule {}