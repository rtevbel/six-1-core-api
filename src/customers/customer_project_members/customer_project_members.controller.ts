import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  MICROSERVICE_CREATE_CUSTOMER_PROJECT_MEMBER_PATTERN,
  MICROSERVICE_FIND_ALL_CUSTOMER_PROJECT_MEMBER_PATTERN,
  MICROSERVICE_FIND_ONE_CUSTOMER_PROJECT_MEMBER_PATTERN,
  MICROSERVICE_UPDATE_CUSTOMER_PROJECT_MEMBER_PATTERN,
  MICROSERVICE_REMOVE_CUSTOMER_PROJECT_MEMBER_PATTERN,
} from './constants';
import { CustomerProjectMembersService } from './customer_project_members.service';
import { CreateCustomerProjectMemberDto } from './dto/create-customer_project_member.dto';
import { UpdateCustomerProjectMemberDto } from './dto/update-customer_project_member.dto';
import { FiltersDto } from './dto/filters.dto';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { CustomerProjectMemberEntity } from './entities/customer_project_member.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { DeleteResult, UpdateResult } from 'typeorm';

@Controller('customer-project-members')
export class CustomerProjectMembersController {
  constructor(
    private readonly customerProjectMembersService: CustomerProjectMembersService,
  ) {}

  /**
   * Creates a customer-project member record.
   * @param userId - ID of the authenticated user.
   * @param createDto - Membership creation payload.
   * @returns The created membership entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_CUSTOMER_PROJECT_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createCustomerProjectMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateCustomerProjectMemberDto,
  ): Promise<CustomerProjectMemberEntity> {
    return this.customerProjectMembersService.create(userId, createDto);
  }

  /**
   * Retrieves customer-project member records.
   * @param userId - ID of the authenticated user.
   * @param filtersDto - Query filters and pagination options.
   * @returns Paginated membership list payload.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_CUSTOMER_PROJECT_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllCustomerProjectMembers(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.customerProjectMembersService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves one customer-project member record.
   * @param userId - ID of the authenticated user.
   * @param id - Membership identifier.
   * @returns The matched membership entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_CUSTOMER_PROJECT_MEMBER_PATTERN)
  findOneCustomerProjectMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<CustomerProjectMemberEntity> {
    return this.customerProjectMembersService.findOne(userId, id);
  }

  /**
   * Updates one customer-project member record.
   * @param userId - ID of the authenticated user.
   * @param updateDto - Membership update payload.
   * @returns TypeORM update result.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CUSTOMER_PROJECT_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateCustomerProjectMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateDto: UpdateCustomerProjectMemberDto,
  ): Promise<UpdateResult> {
    return this.customerProjectMembersService.update(
      userId,
      updateDto.customerProjectMemberId,
      updateDto,
    );
  }

  /**
   * Deletes one customer-project member record.
   * @param userId - ID of the authenticated user.
   * @param id - Membership identifier.
   * @returns TypeORM delete result.
   */
  @MessagePattern(MICROSERVICE_REMOVE_CUSTOMER_PROJECT_MEMBER_PATTERN)
  removeCustomerProjectMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.customerProjectMembersService.remove(userId, id);
  }
}
