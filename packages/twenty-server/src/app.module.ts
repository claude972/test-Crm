import { Module } from '@nestjs/common';
import { ModulesModule } from './modules/modules.module';

@Module({
  imports: [ModulesModule],
})
export class AppModule {}
