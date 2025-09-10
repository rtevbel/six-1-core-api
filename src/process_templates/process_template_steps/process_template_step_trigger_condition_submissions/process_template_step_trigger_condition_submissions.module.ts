import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

import { ProcessTemplateStepTriggerConditionSubmissionsService } from './process_template_step_trigger_condition_submissions.service';
import { ProcessTemplateStepTriggerConditionSubmissionsController } from './process_template_step_trigger_condition_submissions.controller';

import { ProcessTemplateStepTriggerConditionSubmissionEntity } from './entities/process_template_step_trigger_condition_submission.entity';

import { ensureDefinedConfigParam } from '../../../common/functions';
import { MESSAGE_BROKER_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../../common/constants';

/**
 * ProcessTemplateStepTriggerConditionSubmissionsModule is responsible for managing
 * process template step trigger condition submissions. It includes the controller
 * and service for handling operations related to these submissions.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateStepTriggerConditionSubmissionEntity for TypeORM.
    TypeOrmModule.forFeature([
      ProcessTemplateStepTriggerConditionSubmissionEntity,
    ]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_PROCESS_TEMPLATE_STEP_TRIGGER_CONDITION_SUBMISSION_SERVICE_CLIENT_TOKEN,
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
  controllers: [ProcessTemplateStepTriggerConditionSubmissionsController],
  providers: [ProcessTemplateStepTriggerConditionSubmissionsService],
})
export class ProcessTemplateStepTriggerConditionSubmissionsModule {}
