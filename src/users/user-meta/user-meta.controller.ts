import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserMetaService } from './user-meta.service';
import { CreateUserMetaDto } from './dto/create-user-meta.dto';
import { UpdateUserMetaDto } from './dto/update-user-meta.dto';
import { AppRpcValidationPipe } from 'src/common/pipes/app-rpc-validation.pipe';
import {
  V0_1_CREATE_USER_META_PATTERN,
  V0_1_FIND_ALL_USER_META_PATTERN,
  V0_1_FIND_ONE_USER_META_PATTERN,
  V0_1_UPDATE_USER_META_PATTERN,
  V0_1_REMOVE_USER_META_PATTERN,
} from './constants';

/**
 * Controller for handling user metadata operations.
 * This controller interacts with the UserMetaService to perform CRUD operations
 * and responds to microservice message patterns.
 */
@Controller('user_meta')
export class UserMetaController {
  constructor(private readonly userMetaService: UserMetaService) {}

  /**
   * Create a new user metadata entry.
   * @param userId - ID of the user to associate the metadata with.
   * @param createUserMetaDto - Data transfer object containing metadata details.
   * @returns The created metadata entry.
   */
  @MessagePattern(V0_1_CREATE_USER_META_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createMeta(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createUserMetaDto: CreateUserMetaDto,
  ): Promise<any> {
    return await this.userMetaService.create(userId, createUserMetaDto);
  }

  /**
   * Retrieve all metadata entries for a user.
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user whose metadata entries are to be retrieved.
   * @returns An array of metadata entries.
   */
  @MessagePattern(V0_1_FIND_ALL_USER_META_PATTERN)
  async findAllMeta(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('userId', ParseIntPipe) userId: number,
  ): Promise<any> {
    return await this.userMetaService.findAll(requestingUserId, userId);
  }

  /**
   * Retrieve a single metadata entry by its ID.
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user associated with the metadata.
   * @param id - ID of the metadata entry to retrieve.
   * @returns The metadata entry or a NotFoundException if not found.
   */
  @MessagePattern(V0_1_FIND_ONE_USER_META_PATTERN)
  async findOneMeta(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<any> {
    return await this.userMetaService.findOne(requestingUserId, userId, id);
  }

  /**
   * Update a metadata entry.
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user associated with the metadata.
   * @param updateUserMetaDto - Data transfer object containing updated metadata details.
   * @returns The result of the update operation.
   */
  @MessagePattern(V0_1_UPDATE_USER_META_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateMeta(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateUserMetaDto: UpdateUserMetaDto,
  ): Promise<any> {
    return await this.userMetaService.update(
      requestingUserId,
      userId,
      updateUserMetaDto.user_meta_id,
      updateUserMetaDto,
    );
  }

  /**
   * Delete a metadata entry.
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user associated with the metadata.
   * @param id - ID of the metadata entry to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(V0_1_REMOVE_USER_META_PATTERN)
  async removeMeta(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<any> {
    return await this.userMetaService.remove(requestingUserId, userId, id);
  }
}
