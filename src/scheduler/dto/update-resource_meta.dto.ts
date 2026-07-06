import { PartialType } from '@nestjs/mapped-types';
import { CreateResourceMetaDto } from './create-resource_meta.dto';

export class UpdateResourceMetaDto extends PartialType(CreateResourceMetaDto) {}
