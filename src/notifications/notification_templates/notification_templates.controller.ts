import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { NotificationTemplatesService } from './notification_templates.service';
import { CreateNotificationTemplateDto } from './dto/create-notification_template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification_template.dto';
import { FiltersDto } from './dto/filters.dto';
import { NotificationTemplateEntity } from './entities/notification_template.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { GetNotificationVariableCatalogDto } from '../catalog/dto/get-notification-variable-catalog.dto';
import { PreviewNotificationTemplateDto } from '../catalog/dto/preview-notification-template.dto';
import { NotificationVariableCatalogService } from '../catalog/notification-variable-catalog.service';
import { NotificationTemplatePreviewService } from '../catalog/notification-template-preview.service';
import type { NotificationVariableCatalogResult } from '../catalog/interfaces/notification-variable-catalog-result.interface';
import type { PreviewNotificationTemplateResult } from '../catalog/interfaces/preview-notification-template-result.interface';

import {
  MICROSERVICE_CREATE_NOTIFICATION_TEMPLATE_PATTERN,
  MICROSERVICE_FIND_ALL_NOTIFICATION_TEMPLATE_PATTERN,
  MICROSERVICE_FIND_ONE_NOTIFICATION_TEMPLATE_PATTERN,
  MICROSERVICE_UPDATE_NOTIFICATION_TEMPLATE_PATTERN,
  MICROSERVICE_REMOVE_NOTIFICATION_TEMPLATE_PATTERN,
} from './constants';
import {
  MICROSERVICE_GET_NOTIFICATION_VARIABLE_CATALOG_PATTERN,
  MICROSERVICE_PREVIEW_NOTIFICATION_TEMPLATE_PATTERN,
} from '../catalog/notification-catalog.constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';

@Controller('notification-templates')
export class NotificationTemplatesController {
  constructor(
    private readonly notificationTemplatesService: NotificationTemplatesService,
    private readonly variableCatalogService: NotificationVariableCatalogService,
    private readonly templatePreviewService: NotificationTemplatePreviewService,
  ) {}

  /**
   * Handles the creation of a new notification template.
   * @param userId - ID of the user making the request.
   * @param createNotificationTemplateDto - Data transfer object containing template details.
   * @returns The created notification template entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_NOTIFICATION_TEMPLATE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createNotificationTemplate(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    createNotificationTemplateDto: CreateNotificationTemplateDto,
  ): Promise<NotificationTemplateEntity> {
    return this.notificationTemplatesService.create(
      userId,
      createNotificationTemplateDto,
    );
  }

  /**
   * Retrieves all notification templates based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying notification templates.
   * @returns A list of notification templates matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_NOTIFICATION_TEMPLATE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllNotificationTemplates(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.notificationTemplatesService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single notification template by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the notification template to retrieve.
   * @returns The notification template entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_NOTIFICATION_TEMPLATE_PATTERN)
  findOneNotificationTemplate(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<NotificationTemplateEntity | NotFoundException> {
    return this.notificationTemplatesService.findOne(userId, id);
  }

  /**
   * Updates an existing notification template.
   * @param userId - ID of the user making the request.
   * @param updateNotificationTemplateDto - Data transfer object containing updated template details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_NOTIFICATION_TEMPLATE_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateNotificationTemplate(
    @Payload('userId') userId: number,
    @Payload('data')
    updateNotificationTemplateDto: UpdateNotificationTemplateDto,
  ): Promise<UpdateResult> {
    return this.notificationTemplatesService.update(
      userId,
      updateNotificationTemplateDto.templateId,
      updateNotificationTemplateDto,
    );
  }

  /**
   * Deletes a notification template by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the notification template to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_NOTIFICATION_TEMPLATE_PATTERN)
  removeNotificationTemplate(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.notificationTemplatesService.remove(userId, id);
  }

  /**
   * Returns the merged notification variable catalog for template authoring (NV5).
   */
  @MessagePattern(MICROSERVICE_GET_NOTIFICATION_VARIABLE_CATALOG_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  getNotificationVariableCatalog(
    @Payload('data') dto: GetNotificationVariableCatalogDto,
  ): Promise<NotificationVariableCatalogResult> {
    return this.variableCatalogService.getCatalog(dto);
  }

  /**
   * Renders a template against a sample event log or envelope (NV5).
   */
  @MessagePattern(MICROSERVICE_PREVIEW_NOTIFICATION_TEMPLATE_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  previewNotificationTemplate(
    @Payload('data') dto: PreviewNotificationTemplateDto,
  ): Promise<PreviewNotificationTemplateResult> {
    return this.templatePreviewService.preview(dto);
  }
}
