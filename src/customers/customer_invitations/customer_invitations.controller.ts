import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  MICROSERVICE_CREATE_CUSTOMER_INVITATION_PATTERN,
  MICROSERVICE_FIND_ALL_CUSTOMER_INVITATION_PATTERN,
  MICROSERVICE_FIND_ONE_CUSTOMER_INVITATION_PATTERN,
  MICROSERVICE_UPDATE_CUSTOMER_INVITATION_PATTERN,
  MICROSERVICE_REMOVE_CUSTOMER_INVITATION_PATTERN,
} from './constants';
import { CustomerInvitationsService } from './customer_invitations.service';
import { CreateCustomerInvitationDto } from './dto/create-customer_invitation.dto';
import { UpdateCustomerInvitationDto } from './dto/update-customer_invitation.dto';
import { FiltersDto } from './dto/filters.dto';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { CustomerInvitationEntity } from './entities/customer_invitation.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { DeleteResult, UpdateResult } from 'typeorm';

@Controller('customer-invitations')
export class CustomerInvitationsController {
  constructor(
    private readonly customerInvitationsService: CustomerInvitationsService,
  ) {}

  @MessagePattern(MICROSERVICE_CREATE_CUSTOMER_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createCustomerInvitation(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateCustomerInvitationDto,
  ): Promise<CustomerInvitationEntity> {
    return this.customerInvitationsService.create(userId, createDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_CUSTOMER_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllCustomerInvitations(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.customerInvitationsService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_CUSTOMER_INVITATION_PATTERN)
  findOneCustomerInvitation(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<CustomerInvitationEntity> {
    return this.customerInvitationsService.findOne(userId, id);
  }

  @MessagePattern(MICROSERVICE_UPDATE_CUSTOMER_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateCustomerInvitation(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateDto: UpdateCustomerInvitationDto,
  ): Promise<UpdateResult> {
    return this.customerInvitationsService.update(
      userId,
      updateDto.invitationId,
      updateDto,
    );
  }

  @MessagePattern(MICROSERVICE_REMOVE_CUSTOMER_INVITATION_PATTERN)
  removeCustomerInvitation(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.customerInvitationsService.remove(userId, id);
  }
}
