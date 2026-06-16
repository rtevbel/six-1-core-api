import { PartialType } from '@nestjs/mapped-types';
import { CreateActionBindingDto } from './create-action_binding.dto';

export class UpdateActionBindingDto extends PartialType(CreateActionBindingDto) {}
