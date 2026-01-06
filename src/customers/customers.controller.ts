import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  MICROSERVICE_CREATE_CUSTOMER_PATTERN,
  MICROSERVICE_FIND_ALL_CUSTOMER_PATTERN,
  MICROSERVICE_FIND_ONE_CUSTOMER_PATTERN,
  MICROSERVICE_UPDATE_CUSTOMER_PATTERN,
  MICROSERVICE_REMOVE_CUSTOMER_PATTERN,
} from './constants';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FiltersDto } from './dto/filters.dto';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { CustomerEntity } from './entities/customer.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RequirePermissions } from '../authorization/authorization.decorator';
import { DeleteResult, UpdateResult } from 'typeorm';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @MessagePattern(MICROSERVICE_CREATE_CUSTOMER_PATTERN)
  @RequirePermissions('customers.create')
  @UsePipes(AppRpcValidationPipe)
  createCustomer(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerEntity> {
    return this.customersService.create(userId, createCustomerDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_CUSTOMER_PATTERN)
  @RequirePermissions('customers.read')
  @UsePipes(AppRpcValidationPipe)
  findAllCustomers(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.customersService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_CUSTOMER_PATTERN)
  @RequirePermissions('customers.read')
  findOneCustomer(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<CustomerEntity> {
    return this.customersService.findOne(userId, id);
  }

  @MessagePattern(MICROSERVICE_UPDATE_CUSTOMER_PATTERN)
  @RequirePermissions('customers.update')
  @UsePipes(AppRpcValidationPipe)
  updateCustomer(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateCustomerDto: UpdateCustomerDto,
  ): Promise<UpdateResult> {
    return this.customersService.update(
      userId,
      updateCustomerDto.customerId,
      updateCustomerDto,
    );
  }

  @MessagePattern(MICROSERVICE_REMOVE_CUSTOMER_PATTERN)
  @RequirePermissions('customers.delete')
  removeCustomer(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.customersService.remove(userId, id);
  }
}
