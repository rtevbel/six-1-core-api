import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ClientProxy } from '@nestjs/microservices';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindByDTO } from './dto/find-by.dto';
import { of } from 'rxjs';

describe('UsersController', () => {
  let controller: UsersController;
  let userService: UsersService;
  let client: ClientProxy;

  const mockUser: User = {
    user_id: 1,
    username: 'testuser',
    email: 'testuser@example.com',
  } as User;

  beforeEach(async () => {
    const clientProxyMock = {
      send: jest.fn().mockResolvedValue(of(true)),
    };

    const userServiceMock = {
      create: jest.fn().mockResolvedValue(mockUser),
      findAll: jest.fn().mockResolvedValue([mockUser]),
      findOne: jest.fn().mockResolvedValue(mockUser),
      findOneBy: jest.fn().mockResolvedValue(mockUser),
      findBy: jest.fn().mockResolvedValue([mockUser]),
      update: jest.fn().mockResolvedValue(mockUser),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: userServiceMock,
        },
        {
          provide: 'USER_SERVICE',
          useValue: clientProxyMock,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    userService = module.get<UsersService>(UsersService);
    client = module.get<ClientProxy>('USER_SERVICE');
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and return it', async () => {
      const createUserDto: CreateUserDto = {
        first_name: 'test',
        last_name: 'test',
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password',
        extra: '',
      };
      const result = await controller.create(createUserDto, {} as any);
      expect(result).toEqual(mockUser);
      expect(userService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should return a array of users', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockUser]);
      expect(userService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('Should return a single user', async () => {
      const result = await controller.findOne(1);
      expect(result).toEqual(mockUser);
      expect(userService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('findOneBy', () => {
    it('Should return a single user by custom critera', async () => {
      const findByDTO: FindByDTO = { email: 'testuser@example.com' };
      const result = await controller.findOneBy(findByDTO);
      expect(result).toEqual(mockUser);
      expect(userService.findOneBy).toHaveBeenCalledWith(findByDTO);
    });
  });

  describe('findBy', () => {
    it('should return users matching custom critera', async () => {
      const findByDTO: FindByDTO = { email: 'testuser@example.com' };
      const result = await controller.findBy(findByDTO);
      expect(result).toEqual([mockUser]);
      expect(userService.findBy).toHaveBeenCalledWith(findByDTO);
    });
  });

  describe('update', () => {
    it('should update a user and return it', async () => {
      const updateUserDto: UpdateUserDto = { user_id: 1, first_name: 'Ali' };
      const result = await controller.update(updateUserDto);
      expect(result).toEqual(mockUser);
      expect(userService.update).toHaveBeenCalledWith(
        updateUserDto.user_id,
        updateUserDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const result = await controller.remove(1);
      expect(result).toBeUndefined();
      expect(userService.remove).toHaveBeenCalledWith(1);
    });
  });
});
