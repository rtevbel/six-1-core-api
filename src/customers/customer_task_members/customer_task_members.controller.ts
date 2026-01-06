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

  @MessagePattern(MICROSERVICE_CREATE_CUSTOMER_TASK_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createCustomerTaskMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateCustomerTaskMemberDto,
  ): Promise<CustomerTaskMemberEntity> {
    return this.customerTaskMembersService.create(userId, createDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_CUSTOMER_TASK_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllCustomerTaskMembers(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.customerTaskMembersService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_CUSTOMER_TASK_MEMBER_PATTERN)
  findOneCustomerTaskMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<CustomerTaskMemberEntity> {
    return this.customerTaskMembersService.findOne(userId, id);
  }

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

  @MessagePattern(MICROSERVICE_REMOVE_CUSTOMER_TASK_MEMBER_PATTERN)
  removeCustomerTaskMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.customerTaskMembersService.remove(userId, id);
  }
}
