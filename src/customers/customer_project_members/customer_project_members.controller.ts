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

  @MessagePattern(MICROSERVICE_CREATE_CUSTOMER_PROJECT_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createCustomerProjectMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateCustomerProjectMemberDto,
  ): Promise<CustomerProjectMemberEntity> {
    return this.customerProjectMembersService.create(userId, createDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_CUSTOMER_PROJECT_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllCustomerProjectMembers(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.customerProjectMembersService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_CUSTOMER_PROJECT_MEMBER_PATTERN)
  findOneCustomerProjectMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<CustomerProjectMemberEntity> {
    return this.customerProjectMembersService.findOne(userId, id);
  }

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

  @MessagePattern(MICROSERVICE_REMOVE_CUSTOMER_PROJECT_MEMBER_PATTERN)
  removeCustomerProjectMember(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.customerProjectMembersService.remove(userId, id);
  }
}
