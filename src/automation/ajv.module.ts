import { Module } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const AJV = Symbol('AJV');

@Module({
  providers: [
    {
      provide: AJV,
      useFactory: () => {
        const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: false });
        addFormats(ajv);
        return ajv;
      },
    },
  ],
  exports: [AJV],
})
export class AjvModule {}
