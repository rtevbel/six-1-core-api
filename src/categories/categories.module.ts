import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoryEntity } from './entities/category.entity';
import { CategoryDescriptionEntity } from './entities/category-description.entity';

@Module({
  imports: [
    // Registers the CategoryEntity and CategoryDescriptionEntity for TypeORM.
    TypeOrmModule.forFeature([CategoryEntity, CategoryDescriptionEntity]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
