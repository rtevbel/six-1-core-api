import { RpcException } from '@nestjs/microservices';
import {
  AuthoringErrorCode,
  authoringRpcException,
} from './authoring-error-codes';

describe('authoringRpcException', () => {
  it('returns RpcException with code and message on getError()', () => {
    const ex = authoringRpcException(
      AuthoringErrorCode.ViewPanelKeyUnknown,
      'missing panel',
    );
    expect(ex).toBeInstanceOf(RpcException);
    expect(ex.getError()).toEqual({
      code: AuthoringErrorCode.ViewPanelKeyUnknown,
      message: 'missing panel',
    });
  });
});
