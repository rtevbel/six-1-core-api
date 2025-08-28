import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

import { ProcessTemplateStepsService } from './process_template_steps.service';
import { ProcessTemplateStepsController } from './process_template_steps.controller';

import { ProcessTemplateStepEntity } from './entities/process_template_step.entity';
import { ProcessTemplateStepDescriptionEntity } from './entities/process_template_step_description.entity';

import {ProcessTemplateStepRequirementsModule} from "./process_template_step_requirements/process_template_step_requirements.module";
import {ProcessTemplateStepRequirementSubmissionsModule} from "./process_template_step_requirement_submissions/process_template_step_requirement_submissions.module";
import {ProcessTemplateStepTriggerConditionsModule} from "./process_template_step_trigger_conditions/process_template_step_trigger_conditions.module";
import {ProcessTemplateStepTriggerConditionSubmissionsModule} from "./process_template_step_trigger_condition_submissions/process_template_step_trigger_condition_submissions.module"

import { ensureDefinedConfigParam } from '../../common/functions';
import { MESSAGE_BROKER_PROCESS_TEMPLATE_SERVICE_CLIENT_TOKEN } from '../constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';

/**
 * ProcessTemplateStepsModule is responsible for managing process template steps.
 * It includes the controller and service for handling operations
 * related to process template steps.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateStepEntity and ProcessTemplateStepDescriptionEntity for TypeORM.
    TypeOrmModule.forFeature([
      ProcessTemplateStepEntity,
      ProcessTemplateStepDescriptionEntity,
    ]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_PROCESS_TEMPLATE_SERVICE_CLIENT_TOKEN,
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
    ProcessTemplateStepRequirementsModule,
    ProcessTemplateStepRequirementSubmissionsModule,
    ProcessTemplateStepTriggerConditionsModule,
    ProcessTemplateStepTriggerConditionSubmissionsModule
  ],
  controllers: [ProcessTemplateStepsController],
  providers: [ProcessTemplateStepsService],
})
export class ProcessTemplateStepsModule {}
