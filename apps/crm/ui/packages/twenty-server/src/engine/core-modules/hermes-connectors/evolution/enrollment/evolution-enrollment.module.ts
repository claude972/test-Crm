import { Module } from '@nestjs/common';
import { HermesConnectionsModule } from 'src/engine/core-modules/hermes-connections/hermes-connections.module';
import { EvolutionEnrollmentService } from './evolution-enrollment.service';
import { EvolutionEnrollmentResolver } from './evolution-enrollment.resolver';

@Module({
  imports: [HermesConnectionsModule],
  providers: [EvolutionEnrollmentService, EvolutionEnrollmentResolver],
  exports: [EvolutionEnrollmentService, EvolutionEnrollmentResolver],
})
export class EvolutionEnrollmentModule {}
