import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { SharingInvitationsService } from '../services/sharing_invitations.service';
import { CreateSharingInvitationDto } from '../dto/sharing-invitations/create-sharing-invitation.dto';
import { FiltersSharingInvitationDto } from '../dto/sharing-invitations/filters-sharing-invitation.dto';
import { UpdateSharingInvitationDto } from '../dto/sharing-invitations/update-sharing-invitation.dto';
import {
  MICROSERVICE_CREATE_SHARING_INVITATION_PATTERN,
  MICROSERVICE_FIND_ALL_SHARING_INVITATIONS_PATTERN,
  MICROSERVICE_FIND_ONE_SHARING_INVITATION_PATTERN,
  MICROSERVICE_UPDATE_SHARING_INVITATION_PATTERN,
  MICROSERVICE_REMOVE_SHARING_INVITATION_PATTERN,
} from '../constants';

/**
 * Controller responsible for handling RPC operations for sharing invitations.
 *
 * Modeled after the events controller:
 *  - Exposes handlers via message patterns.
 *  - Accepts `userId` from the RPC payload.
 *  - Uses `AppRpcValidationPipe` for validating incoming DTOs.
 */
@Controller('sharing-invitations')
@UseFilters(AppRpcExceptionsFilter)
export class SharingInvitationsController {
  constructor(
    private readonly sharingInvitationsService: SharingInvitationsService,
  ) {}

  /**
   * Creates a new sharing invitation.
   * @param userId - ID of the user making the request.
   * @param dto - DTO describing the invitation details.
   * @returns The created sharing invitation entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_SHARING_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateSharingInvitationDto,
  ) {
    return this.sharingInvitationsService.create(userId, dto);
  }

  /**
   * Retrieves sharing invitations using the provided filters.
   * @param userId - ID of the user making the request.
   * @param filters - Filters for pagination, sorting and narrowing the results.
   * @returns A list of invitations and pagination details.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_SHARING_INVITATIONS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filters: FiltersSharingInvitationDto,
  ) {
    return this.sharingInvitationsService.findAll(userId, filters);
  }

  /**
   * Retrieves a single sharing invitation by ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `invitationId` to fetch.
   * @returns The sharing invitation entity if found.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_SHARING_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { invitationId: number },
  ) {
    return this.sharingInvitationsService.findOne(userId, dto.invitationId);
  }

  /**
   * Updates an existing sharing invitation.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing `invitationId` and the update payload.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_SHARING_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    dto: { invitationId: number } & UpdateSharingInvitationDto,
  ) {
    const { invitationId, ...payload } = dto;
    return this.sharingInvitationsService.update(userId, invitationId, payload);
  }

  /**
   * Deletes a sharing invitation by ID.
   * @param userId - ID of the user making the request.
   * @param dto - Object containing the `invitationId` to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_SHARING_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: { invitationId: number },
  ) {
    return this.sharingInvitationsService.remove(userId, dto.invitationId);
  }
}
