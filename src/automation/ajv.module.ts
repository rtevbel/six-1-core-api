import { Module } from '@nestjs/common';
// Use the 2020 build:
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export const AJV = Symbol('AJV');

@Module({
  providers: [
    {
      provide: AJV,
      useFactory: () => {
        const ajv = new Ajv2020({
          allErrors: true,
          strict: false,            // relax strictness for pragmatic schemas
          removeAdditional: false,  // we want to see unexpected fields rather than stripping
        });
        addFormats(ajv);
        return ajv;
      },
    },
  ],
  exports: [AJV],
})
export class AjvModule {}