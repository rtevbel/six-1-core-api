import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessTemplateStepAssigneeEntity } from './entities/process_template_step_assignee.entity';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';
import { CreateProcessTemplateStepAssigneeDto } from './dto/create-process_template_step_assignee.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindOneProcessTemplateStepAssigneeDto } from './dto/find-one-process_template_step_assignee.dto';
import { RemoveProcessTemplateStepAssigneeDto } from './dto/remove-process_template_step_assignee.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { NO_RECORD_FOUND_MESSAGE } from '../../../common/constants';
import {
  getEffectiveTenantId,
  isProcessTemplateStepTenantAccessible,
} from '../../../common/utils/tenant-scope.util';
import { assertProcessTemplateStepAssigneeAllowed } from './process-template-step-assignee.validation';
import { ProcessFeatureFlagsService } from '../../../automation/config/process-feature-flags.service';
import {
  PROCESS_TEMPLATE_STEP_ASSIGNEE_DEPRECATED_MESSAGE,
  PROCESS_TEMPLATE_STEP_ASSIGNEE_WRITE_BLOCKED_MESSAGE,
} from '../../../automation/process-step-assignee-spec.constants';

@Injectable()
export class ProcessTemplateStepAssigneesService {
  private readonly logger = new Logger(ProcessTemplateStepAssigneesService.name);

  constructor(
    @InjectRepository(ProcessTemplateStepAssigneeEntity)
    private readonly assigneeRepository: Repository<ProcessTemplateStepAssigneeEntity>,
    @InjectRepository(ProcessTemplateStepEntity)
    private readonly stepRepository: Repository<ProcessTemplateStepEntity>,
    private readonly processFlags: ProcessFeatureFlagsService,
  ) {}

  /**
   * @deprecated Use `assigneeSpec` on process template steps instead.
   */
  async create(
    userId: number,
    createDto: CreateProcessTemplateStepAssigneeDto,
  ): Promise<ProcessTemplateStepAssigneeEntity> {
    this.assertWritesAllowed('create');
    await assertProcessTemplateStepAssigneeAllowed(this.stepRepository, {
      processTemplateStepId: createDto.processTemplateStepId,
      tenantId: createDto.tenantId,
    });

    return this.assigneeRepository.save(
      this.assigneeRepository.create({
        processTemplateStepId: createDto.processTemplateStepId,
        tenantUserId: createDto.tenantUserId,
        assignmentOrder: createDto.assignmentOrder ?? 0,
        createdBy: createDto.createdBy ?? userId,
      }),
    );
  }

  async findAll(
    _userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    await assertProcessTemplateStepAssigneeAllowed(this.stepRepository, {
      processTemplateStepId: filtersDto.processTemplateStepId,
      tenantId: filtersDto.tenantId,
    });

    const [records, total] = await this.assigneeRepository.findAndCount({
      where: { processTemplateStepId: filtersDto.processTemplateStepId },
      order: { assignmentOrder: 'ASC', stepAssigneeId: 'ASC' },
    });

    return {
      records,
      total,
      deprecated: true,
      deprecationMessage: PROCESS_TEMPLATE_STEP_ASSIGNEE_DEPRECATED_MESSAGE,
    };
  }

  async findOne(
    _userId: number,
    data: number | FindOneProcessTemplateStepAssigneeDto,
  ): Promise<ProcessTemplateStepAssigneeEntity> {
    const stepAssigneeId =
      typeof data === 'number' ? data : data.stepAssigneeId;
    const tenantId = typeof data === 'number' ? undefined : data.tenantId;

    const assignee = await this.assigneeRepository.findOne({
      where: { stepAssigneeId },
      relations: ['processTemplateStep', 'processTemplateStep.processTemplate'],
    });

    if (!assignee?.processTemplateStep?.processTemplate) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessTemplateStepAssignee',
        ),
      );
    }

    const effectiveTenantId = getEffectiveTenantId(tenantId);
    if (
      !isProcessTemplateStepTenantAccessible(
        assignee.processTemplateStep.processTemplate.tenantId,
        effectiveTenantId,
      )
    ) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          'ProcessTemplateStepAssignee',
        ),
      );
    }

    return assignee;
  }

  /**
   * @deprecated Use `assigneeSpec` on process template steps instead.
   */
  async remove(
    userId: number,
    data: number | RemoveProcessTemplateStepAssigneeDto,
  ): Promise<DeleteResult> {
    this.assertWritesAllowed('remove');
    const assignee = await this.findOne(
      userId,
      typeof data === 'number' ? data : data,
    );

    return this.assigneeRepository.delete({
      stepAssigneeId: assignee.stepAssigneeId,
    });
  }

  private assertWritesAllowed(operation: string): void {
    if (!this.processFlags.isStepAssigneeSpecEnabled()) {
      this.logger.warn(
        `${operation} on process_template_step_assignees is deprecated; use assigneeSpec on template steps`,
      );
      return;
    }

    throw new RpcException(PROCESS_TEMPLATE_STEP_ASSIGNEE_WRITE_BLOCKED_MESSAGE);
  }
}
