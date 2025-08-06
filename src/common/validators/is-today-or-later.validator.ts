import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
  } from 'class-validator';
  
  /**
   * Custom validation decorator to check if a date is today or later.
   * 
   * @param validationOptions - Optional validation options for customizing error messages and behavior.
   * @returns A function that registers the custom validation logic.
   */
  export function IsTodayOrLater(validationOptions?: ValidationOptions) {
    return (object: any, propertyName: string) => {
      // Registers the custom validation decorator.
      registerDecorator({
        name: 'isTodayOrLater', // Name of the validation rule.
        target: object.constructor, // The target object where the validation is applied.
        propertyName, // The property name to validate.
        options: validationOptions, // Validation options passed by the user.
        validator: {
          /**
           * Validation logic to check if the value is today or later.
           * 
           * @param value - The value of the property being validated.
           * @param _args - Additional validation arguments (not used here).
           * @returns True if the value is today or later, false otherwise.
           */
          validate(value: any, _args: ValidationArguments) {
            const d = new Date(value); // Converts the value to a Date object.
            if (Number.isNaN(d.getTime())) return false; // Returns false if the value is not a valid date.
            const today = new Date(); // Gets the current date.
            today.setHours(0, 0, 0, 0); // Resets the time to midnight for comparison.
            return d >= today; // Checks if the date is today or later.
          },
          /**
           * Default error message for the validation rule.
           * 
           * @param _args - Additional validation arguments (not used here).
           * @returns The default error message.
           */
          defaultMessage(_args: ValidationArguments) {
            return 'offDate must be today or in the future'; // Error message when validation fails.
          },
        },
      });
    };
  }