import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Ensures exactly one of this property and `otherProperty` is a positive int.
 */
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
          return 'Provide exactly one of coreId (SoR-backed) or instanceId (standalone).';
        },
      },
    });
  };
}

/**
 * DTO used to resolve a specific configurable object instance.
 *
 * Use `coreId` for `sor_bound` objects; use `instanceId` for `standalone` objects.
 * `system_table` definitions reject `coreId` here; use existing REST via the Object Runner.
 */
export class ResolveConfigInstanceDto {
  /**
   * Tenant scope for schema resolution. Omit for global / super-admin published
   * template-set scope (same rules as `GetConfigSchemaDto`).
   *
   * For standalone `instanceId` resolve, `0` is valid (system/global process scope).
   */
  @IsInt()
  @Min(0)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ExactlyOneOf('instanceId')
  coreId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ExactlyOneOf('coreId')
  instanceId?: number;
}
