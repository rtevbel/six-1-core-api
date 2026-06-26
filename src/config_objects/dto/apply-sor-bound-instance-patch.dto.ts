import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function ExactlyOneOf(
  otherProperty: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'exactlyOneOf',
      target: object.constructor,
      propertyName,
      constraints: [otherProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [other] = args.constraints as [string];
          const obj = args.object as Record<string, unknown>;
          const hasThis =
            typeof value === 'number' && Number.isFinite(value) && value >= 1;
          const otherVal = obj[other];
          const hasOther =
            typeof otherVal === 'number' &&
            Number.isFinite(otherVal) &&
            otherVal >= 1;
          return hasThis !== hasOther;
        },
        defaultMessage() {
          return 'Provide exactly one of coreId (existing row) or stepObjectInstanceId (deferred first save).';
        },
      },
    });
  };
}

/**
 * Applies allowlisted SoR column updates and `*_meta` JSON patches in one
 * transaction for `sor_bound` configurable objects (Object Runner save).
 *
 * **First save (deferred provisioning):** pass `stepObjectInstanceId` without
 * `coreId` for `create_on_enter` process step bindings. The backend creates the
 * SoR row from the patch and links the binding.
 *
 * Gateway must enforce domain permissions (e.g. `projects.update`) before proxying.
 */
export class ApplySorBoundInstancePatchDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  @ExactlyOneOf('stepObjectInstanceId')
  coreId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  @ExactlyOneOf('coreId')
  stepObjectInstanceId?: number;

  @IsOptional()
  @IsObject()
  corePatch?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metaPatch?: Record<string, unknown>;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  customerId?: number;
}
