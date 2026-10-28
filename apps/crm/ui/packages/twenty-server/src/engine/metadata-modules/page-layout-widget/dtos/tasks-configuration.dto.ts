import { Field, ObjectType } from '@nestjs/graphql';

import { IsIn, IsNotEmpty } from 'class-validator';
import { type TasksConfiguration } from 'kovaa-lab-shared/types';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

@ObjectType('TasksConfiguration')
export class TasksConfigurationDTO implements TasksConfiguration {
  @Field(() => WidgetConfigurationType)
  @IsIn([WidgetConfigurationType.TASKS])
  @IsNotEmpty()
  configurationType: WidgetConfigurationType.TASKS;
}
