import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerContactInfoService } from './customer_contact_info.service';
import { CustomerContactInfoController } from './customer_contact_info.controller';
import { CustomerContactInfoEntity } from './entities/customer_contact_info.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerContactInfoEntity])],
  controllers: [CustomerContactInfoController],
  providers: [CustomerContactInfoService],
  exports: [CustomerContactInfoService],
})
export class CustomerContactInfoModule {}
