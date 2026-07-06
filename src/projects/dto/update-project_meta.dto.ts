import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectMetaDto } from './create-project_meta.dto';

export class UpdateProjectMetaDto extends PartialType(CreateProjectMetaDto) {}
