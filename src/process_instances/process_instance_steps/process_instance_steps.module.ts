import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ProcessInstanceStepsService } from './process_instance_steps.service';
import { ProcessInstanceStepsController } from './process_instance_steps.controller';
import { ProcessInstanceStepEntity } from './entities/process_instance_step.entity';
import { ensureDefinedConfigParam } from '../../common/functions';
import { MESSAGE_BROKER_PROCESS_INSTANCE_SERVICE_CLIENT_TOKEN } from '../constants';
import { ProcessInstanceStepRequirementsModule } from './process_instance_step_requirements/process_instance_step_requirements.module';
import { ProcessInstanceStepRequirementSubmissionsModule } from './process_instance_step_requirement_submissions/process_instance_step_requirement_submissions.module';
import { ProcessInstanceStepTriggerConditionsModule } from './process_instance_step_trigger_conditions/process_instance_step_trigger_conditions.module';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../common/constants';

/**
 * ProcessInstanceStepsModule is responsible for managing process instance steps.
 * It includes the controller and service for handling operations
 * related to process instance steps.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessInstanceStepEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessInstanceStepEntity]),
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
    ProcessInstanceStepRequirementsModule,
    ProcessInstanceStepRequirementSubmissionsModule,
    ProcessInstanceStepTriggerConditionsModule,
  ],
  controllers: [ProcessInstanceStepsController],
  providers: [ProcessInstanceStepsService],
  exports: [ProcessInstanceStepsService],
})
export class ProcessInstanceStepsModule {}
