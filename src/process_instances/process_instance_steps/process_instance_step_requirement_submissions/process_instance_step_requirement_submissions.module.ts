import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ProcessInstanceStepRequirementSubmissionsService } from './process_instance_step_requirement_submissions.service';
import { ProcessInstanceStepRequirementSubmissionsController } from './process_instance_step_requirement_submissions.controller';
import { ProcessInstanceStepRequirementSubmissionEntity } from './entities/process_instance_step_requirement_submission.entity';
import { ensureDefinedConfigParam } from '../../../common/functions';
import { MESSAGE_BROKER_PROCESS_INSTANCE_STEP_REQUIREMENT_SUBMISSION_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../../../common/constants';

/**
 * ProcessInstanceStepRequirementSubmissionsModule is responsible for managing
 * process instance step requirement submissions. It includes the controller
 * and service for handling operations related to submissions.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessInstanceStepRequirementSubmissionEntity for TypeORM.
    TypeOrmModule.forFeature([ProcessInstanceStepRequirementSubmissionEntity]),
    // Configures the message broker client for microservices.
    ClientsModule.registerAsync([
      {
        name: MESSAGE_BROKER_PROCESS_INSTANCE_STEP_REQUIREMENT_SUBMISSION_SERVICE_CLIENT_TOKEN,
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
  controllers: [ProcessInstanceStepRequirementSubmissionsController],
  providers: [ProcessInstanceStepRequirementSubmissionsService],
})
export class ProcessInstanceStepRequirementSubmissionsModule {}