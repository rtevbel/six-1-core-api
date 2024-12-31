import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let userRepository: Repository<User>;
  let service: UsersService;

  const mockUser = {
    user_id: 1,
    username: 'testuser',
    email: 'test@example.com',
  } as User;

  const mockUserRepository = {
    save: jest.fn().mockResolvedValue(mockUser),
    create: jest.fn().mockReturnValue(mockUser),
    find: jest.fn().mockResolvedValue([mockUser]),
    findOneBy: jest.fn().mockResolvedValue(mockUser),
    findBy: jest.fn().mockResolvedValue([mockUser]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      const result = await service.create(createUserDto);
      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const results = await service.findAll();
      expect(userRepository.find).toHaveBeenCalled();
      expect(results).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('shoud return user', async () => {
      const result = await service.findOne(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ user_id: 1 });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneBy', () => {
    it('should return user by custom critera', async () => {
      const critera = { email: 'test@example.com' };
      const result = await service.findOneBy(critera);
      expect(userRepository.findOneBy).toHaveBeenCalledWith(critera);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findBy', () => {
    it('shoud return users matching custom critera', async () => {
      const cirtera = { email: 'test@example.com' };
      const results = await service.findBy(cirtera);
      expect(userRepository.findOneBy).toHaveBeenCalledWith(cirtera);
      expect(results).toEqual([mockUser]);
    });
  });

  describe('update', () => {
    it('should update and return user', async () => {
      const updateUserDto: UpdateUserDto = {
        user_id: 1,
        first_name: 'testupdate',
      };
      const user = await service.update(updateUserDto.user_id, updateUserDto);
      expect(userRepository.update).toHaveBeenCalledWith(
        { user_id: updateUserDto.user_id },
        updateUserDto,
      );
      expect(user).toEqual({ affected: 1 });
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const result = await service.remove(1);
      expect(userRepository.delete).toHaveBeenCalledWith({ user_id: 1 });
      expect(result).toBeUndefined();
    });
  });
});
