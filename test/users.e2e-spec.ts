import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { AppRpcValidationPipe } from '../src/common/pipes/app-rpc-validation.pipe';
import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { UpdateUserDto } from '../src/users/dto/update-user.dto';
import { User } from '../src/users/entities/user.entity';
import { ClientProxy } from '@nestjs/microservices';
import { of, lastValueFrom } from 'rxjs';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('UsersController (e2e)', () => {
  let app: INestMicroservice;
  let usersService: UsersService;
  let clientProxy: ClientProxy;

  // Mocked RabbitMQ ClientProxy
  const clientProxyMock = {
    send: jest.fn().mockImplementation((pattern, data) => {
      if (pattern === 'create_user') {
        return of({ user_id: 1, ...data });
      }
      if (pattern === 'find_all') {
        return of([
          {
            user_id: 1,
            first_name: 'John Doe',
            last_name: 'John Doe',
            username: 'test',
            password: 'test',
            email: 'john@example.com',
            extra: '',
          },
        ]);
      }
      if (pattern === 'find_one') {
        return of({
          user_id: data.user_id,
          first_name: 'John Doe',
          last_name: 'John Doe',
          username: 'test',
          password: 'test',
          email: 'john@example.com',
          extra: '',
        });
      }
      if (pattern === 'update_user') {
        return of({ user_id: data.user_id, ...data });
      }
      if (pattern === 'delete_user') {
        return of({ success: true });
      }
      return of(null);
    }),
  };

  const mockUserRepository = {
    find: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: 'USER_SERVICE', // Provide the mock for the RabbitMQ ClientProxy
          useValue: clientProxyMock,
        },
        {
          provide: getRepositoryToken(User), // Provide the mock for the User Repository
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    app = moduleFixture.createNestMicroservice({
      transport: null,
    });
    app.useGlobalPipes(new AppRpcValidationPipe());
    await app.listen();

    usersService = app.get<UsersService>(UsersService);
    clientProxy = app.get<ClientProxy>('USER_SERVICE');
  });

  afterAll(async () => {
    await app.close();
  });

  // Test the 'create_user' message pattern
  it('should create a new user', async () => {
    const createUserDto: CreateUserDto = {
      first_name: 'John Doe',
      last_name: 'John Doe',
      username: 'test',
      password: 'test',
      email: 'john@example.com',
      extra: '',
    };

    const result = await lastValueFrom(
      clientProxy.send('create_user', createUserDto),
    );

    expect(result).toEqual({ user_id: 1, ...createUserDto });
    expect(clientProxy.send).toHaveBeenCalledWith('create_user', createUserDto);
  });

  // Test the 'find_all' message pattern
  it('should retrieve all users', async () => {
    const result = await lastValueFrom(clientProxy.send('find_all', {}));

    expect(result).toEqual([
      {
        user_id: 1,
        first_name: 'John Doe',
        last_name: 'John Doe',
        username: 'test',
        password: 'test',
        email: 'john@example.com',
        extra: '',
      },
    ]);
    expect(clientProxy.send).toHaveBeenCalledWith('find_all', {});
  });

  // Test the 'find_one' message pattern
  it('should retrieve a single user by id', async () => {
    const result = await lastValueFrom(
      clientProxy.send('find_one', { user_id: 1 }),
    );

    expect(result).toEqual({
      user_id: 1,
      first_name: 'John Doe',
      last_name: 'John Doe',
      username: 'test',
      password: 'test',
      email: 'john@example.com',
      extra: '',
    });
    expect(clientProxy.send).toHaveBeenCalledWith('find_one', { user_id: 1 });
  });

  // Test the 'update_user' message pattern
  it('should update a user', async () => {
    const updateUserDto: UpdateUserDto = {
      user_id: 1,
      first_name: 'John Doe',
      last_name: 'John Doe',
      username: 'test',
      password: 'test',
      email: 'john@example.com',
      extra: '',
    };

    const result = await lastValueFrom(
      clientProxy.send('update_user', updateUserDto),
    );
    console.log(result, 'resultresultresult');

    expect(result).toEqual({
      user_id: 1,
      first_name: 'John Doe',
      last_name: 'John Doe',
      username: 'test',
      password: 'test',
      email: 'john@example.com',
      extra: '',
    });
    expect(clientProxy.send).toHaveBeenCalledWith('update_user', updateUserDto);
  });

  // Test the 'delete_user' message pattern
  it('should delete a user by id', async () => {
    const result = await lastValueFrom(
      clientProxy.send('delete_user', { user_id: 1 }),
    );

    expect(result).toEqual({ success: true });
    expect(clientProxy.send).toHaveBeenCalledWith('delete_user', {
      user_id: 1,
    });
  });
});
