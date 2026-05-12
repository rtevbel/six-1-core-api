import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  MICROSERVICE_CREATE_CUSTOMER_CONTACT_INFO_PATTERN,
  MICROSERVICE_FIND_ALL_CUSTOMER_CONTACT_INFO_PATTERN,
  MICROSERVICE_FIND_ONE_CUSTOMER_CONTACT_INFO_PATTERN,
  MICROSERVICE_UPDATE_CUSTOMER_CONTACT_INFO_PATTERN,
  MICROSERVICE_REMOVE_CUSTOMER_CONTACT_INFO_PATTERN,
} from './constants';
import { CustomerContactInfoService } from './customer_contact_info.service';
import { CreateCustomerContactInfoDto } from './dto/create-customer_contact_info.dto';
import { UpdateCustomerContactInfoDto } from './dto/update-customer_contact_info.dto';
import { FiltersDto } from './dto/filters.dto';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { CustomerContactInfoEntity } from './entities/customer_contact_info.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { DeleteResult, UpdateResult } from 'typeorm';

@Controller('customer-contact-info')
export class CustomerContactInfoController {
  constructor(
    private readonly customerContactInfoService: CustomerContactInfoService,
  ) {}

  /**
   * Creates a customer contact-info record.
   * @param userId - ID of the authenticated user.
   * @param customerId - Owning customer identifier.
   * @param createDto - Contact-info creation payload.
   * @returns The created contact-info entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_CUSTOMER_CONTACT_INFO_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createCustomerContactInfo(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('customerId', ParseIntPipe) customerId: number,
    @Payload('data') createDto: CreateCustomerContactInfoDto,
  ): Promise<CustomerContactInfoEntity> {
    return this.customerContactInfoService.create(
      userId,
      customerId,
      createDto,
    );
  }

  /**
   * Retrieves customer contact-info list for a customer.
   * @param userId - ID of the authenticated user.
   * @param filtersDto - Query filters and pagination options.
   * @returns Paginated contact-info list payload.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_CUSTOMER_CONTACT_INFO_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllCustomerContactInfo(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.customerContactInfoService.findAllByFilters(userId, filtersDto);
  }

  /**
   * Retrieves one customer contact-info record.
   * @param userId - ID of the authenticated user.
   * @param customerId - Owning customer identifier.
   * @param id - Contact-info identifier.
   * @returns The matched contact-info entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_CUSTOMER_CONTACT_INFO_PATTERN)
  findOneCustomerContactInfo(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('customerId', ParseIntPipe) customerId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<CustomerContactInfoEntity> {
    return this.customerContactInfoService.findOne(userId, customerId, id);
  }

  /**
   * Updates one customer contact-info record.
   * @param userId - ID of the authenticated user.
   * @param customerId - Owning customer identifier.
   * @param updateDto - Contact-info update payload.
   * @returns TypeORM update result.
   */
  @MessagePattern(MICROSERVICE_UPDATE_CUSTOMER_CONTACT_INFO_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateCustomerContactInfo(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('customerId', ParseIntPipe) customerId: number,
    @Payload('data') updateDto: UpdateCustomerContactInfoDto,
  ): Promise<UpdateResult> {
    return this.customerContactInfoService.update(
      userId,
      customerId,
      updateDto.customerContactId,
      updateDto,
    );
  }

  /**
   * Deletes one customer contact-info record.
   * @param userId - ID of the authenticated user.
   * @param customerId - Owning customer identifier.
   * @param id - Contact-info identifier.
   * @returns TypeORM delete result.
   */
  @MessagePattern(MICROSERVICE_REMOVE_CUSTOMER_CONTACT_INFO_PATTERN)
  removeCustomerContactInfo(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('customerId', ParseIntPipe) customerId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.customerContactInfoService.remove(userId, customerId, id);
  }
}
