import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  MICROSERVICE_CREATE_CUSTOMER_TASK_MEMBER_PATTERN,
  MICROSERVICE_FIND_ALL_CUSTOMER_TASK_MEMBER_PATTERN,
  MICROSERVICE_FIND_ONE_CUSTOMER_TASK_MEMBER_PATTERN,
  MICROSERVICE_UPDATE_CUSTOMER_TASK_MEMBER_PATTERN,
  MICROSERVICE_REMOVE_CUSTOMER_TASK_MEMBER_PATTERN,
} from './constants';
import { CustomerTaskMembersService } from './customer_task_members.service';
import { CreateCustomerTaskMemberDto } from './dto/create-customer_task_member.dto';
import { UpdateCustomerTaskMemberDto } from './dto/update-customer_task_member.dto';
import { FiltersDto } from './dto/filters.dto';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { CustomerTaskMemberEntity } from './entities/customer_task_member.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { DeleteResult, UpdateResult } from 'typeorm';

@Controller('customer-task-members')
export class CustomerTaskMembersController {
  constructor(
    private readonly customerTaskMembersService: CustomerTaskMembersService,
  ) {}

  /**
   * Creates a customer-task member record.
   * @param userId - ID of the authenticated user.
   * @param createDto - Membership creation payload.
   * @returns The created membership entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_CUSTOMER_TASK_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createCustomerTaskMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateCustomerTaskMemberDto,
  ): Promise<CustomerTaskMemberEntity> {
    return this.customerTaskMembersService.create(userId, createDto);
  }

  /**
   * Retrieves customer-task member records.
   * @param userId - ID of the authenticated user.
   * @param filtersDto - Query filters and pagination options.
   * @returns Paginated membership list payload.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_CUSTOMER_TASK_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllCustomerTaskMembers(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.customerTaskMembersService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves one customer-task member record.
   * @param userId - ID of the authenticated user.
   * @param id - Membership identifier.
   * @returns The matched membership entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_CUSTOMER_TASK_MEMBER_PATTERN)
  findOneCustomerTaskMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<CustomerTaskMemberEntity> {
    return this.customerTaskMembersService.findOne(userId, id);
  }

  /**
   * Updates one customer-task member record.
   * @param userId - ID of the authenticated user.
   * @param updateDto - Membership update payload.
   * @returns TypeORM update result.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CUSTOMER_TASK_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateCustomerTaskMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateDto: UpdateCustomerTaskMemberDto,
  ): Promise<UpdateResult> {
    return this.customerTaskMembersService.update(
      userId,
      updateDto.customerTaskMemberId,
      updateDto,
    );
  }

  /**
   * Deletes one customer-task member record.
   * @param userId - ID of the authenticated user.
   * @param id - Membership identifier.
   * @returns TypeORM delete result.
   */
  @MessagePattern(MICROSERVICE_REMOVE_CUSTOMER_TASK_MEMBER_PATTERN)
  removeCustomerTaskMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.customerTaskMembersService.remove(userId, id);
  }
}
