import { PartialType } from '@nestjs/mapped-types';
import { CreateSharingLogDto } from './create-sharing-log.dto';

export class UpdateSharingLogDto extends PartialType(CreateSharingLogDto) {}
