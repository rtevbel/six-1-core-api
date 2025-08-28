import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validation decorator to check if a date is after another specified date.
 *
 * @param property - The name of the property to compare against.
 * @param validationOptions - Optional validation options for customizing error messages and behavior.
 * @returns A function that registers the custom validation logic.
 */
export function IsAfter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    // Registers the custom validation decorator.
    registerDecorator({
      name: 'isAfter', // Name of the validation rule.
      target: object.constructor, // The target object where the validation is applied.
      propertyName, // The property name to validate.
      options: validationOptions, // Validation options passed by the user.
      constraints: [property], // The property to compare against.
      validator: {
        /**
         * Validation logic to check if the value is after the specified property value.
         *
         * @param value - The value of the property being validated.
         * @param args - Validation arguments containing the object and constraints.
         * @returns True if the value is after the specified property value, false otherwise.
         */
        validate(value: any, args: ValidationArguments) {
          // Skip validation if the value or related property value is missing.
          if (value == null) return true;
          const [relatedPropertyName] = args.constraints; // Extract the related property name.
          const relatedValue = (args.object as any)[relatedPropertyName]; // Get the related property value.
          if (relatedValue == null) return true;

          // Convert both values to timestamps for comparison.
          const date = new Date(value).getTime();
          const relatedDate = new Date(relatedValue).getTime();

          // Ensure both values are valid dates and check if the value is after the related value.
          return !isNaN(date) && !isNaN(relatedDate) && date > relatedDate;
        },
        /**
         * Default error message for the validation rule.
         *
         * @param args - Validation arguments containing the object and constraints.
         * @returns The default error message.
         */
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints; // Extract the related property name.
          return `${args.property} must be later than ${relatedPropertyName}`; // Error message when validation fails.
        },
      },
    });
  };
}
