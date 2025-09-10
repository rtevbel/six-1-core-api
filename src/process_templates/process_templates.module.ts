import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ProcessTemplatesService } from './process_templates.service';
import { ProcessTemplatesController } from './process_templates.controller';
import { ProcessTemplateStepsModule } from './process_template_steps/process_template_steps.module';
import { ProcessTemplateEntity } from './entities/process_template.entity';
import { ProcessTemplateDescriptionEntity } from './entities/process_template_description.entity';
import { ProcessTemplateCategoryEntity } from './entities/process_template_category.entity';

import { ensureDefinedConfigParam } from '../common/functions';
import { MESSAGE_BROKER_PROCESS_TEMPLATE_SERVICE_CLIENT_TOKEN } from './constants';

import {
  MESSAGE_BROKER_USERNAME_KEY,
  MESSAGE_BROKER_HOST_KEY,
  MESSAGE_BROKER_PASSWORD_KEY,
  MESSAGE_BROKER_PORT_KEY,
  MESSAGE_BROKER_URL_KEY,
  SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY,
} from '../common/constants';

/**
 * ProcessTemplatesModule is responsible for managing process templates.
 * It includes the controller and service for handling operations
 * related to process templates and integrates various submodules for process template management.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateEntity for TypeORM.
    TypeOrmModule.forFeature([
      ProcessTemplateEntity,
      ProcessTemplateDescriptionEntity,
      ProcessTemplateCategoryEntity,
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
    ProcessTemplateStepsModule, // Module for managing process template steps
  ],
  controllers: [ProcessTemplatesController],
  providers: [ProcessTemplatesService],
  exports: [ProcessTemplatesService],
})
export class ProcessTemplatesModule {}
