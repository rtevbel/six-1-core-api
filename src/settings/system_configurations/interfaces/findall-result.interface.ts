import { SystemSettingGroupEntity } from '../entities/system-setting-group.entity';
import { SystemSettingDefinitionEntity } from '../entities/system-setting-definition.entity';
import { SystemSettingValueView } from './setting-value-view.interface';

export interface FindAllGroupsResultInterface {
  items: SystemSettingGroupEntity[];
  groups: SystemSettingGroupEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FindAllDefinitionsResultInterface {
  items: SystemSettingDefinitionEntity[];
  definitions: SystemSettingDefinitionEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FindSettingValuesResultInterface {
  items: SystemSettingValueView[];
  values: SystemSettingValueView[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
