import { Logger, Module } from '@nestjs/common';

import { isDefined } from 'kovaa-lab-shared/utils';

import { ClickHouseModule } from 'src/database/clickhouse/clickhouse.module';
import { ClickHouseEventSink } from 'src/engine/core-modules/event-logs/ingest/clickhouse-event.sink';
import { ConsoleEventSink } from 'src/engine/core-modules/event-logs/ingest/console-event.sink';
import { CreateEventLogFromInternalEvent } from 'src/engine/core-modules/event-logs/ingest/create-event-log-from-internal-event';
import {
  getAvailableSinkNames,
  KNOWN_SINK_NAMES,
} from 'src/engine/core-modules/event-logs/ingest/event-sink-availability';
import {
  EVENT_SINKS,
  type EventSink,
} from 'src/engine/core-modules/event-logs/ingest/event-sink';
import { ForwardEventLogFromEntityEventsToDbQueue } from 'src/engine/core-modules/event-logs/ingest/forward-event-log-from-entity-events-to-db-queue';
import { WorkspaceEventSinkService } from 'src/engine/core-modules/event-logs/ingest/workspace-event-sink.service';
import { EventLogLiveModule } from 'src/engine/core-modules/event-logs/live/event-log-live.module';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

const eventSinksProvider = {
  provide: EVENT_SINKS,
  useFactory: (
    kovaa-labConfigService: KovaaLab CRMConfigService,
    clickHouseEventSink: ClickHouseEventSink,
    consoleEventSink: ConsoleEventSink,
  ): EventSink[] => {
    const sinkByName: Record<string, EventSink> = {
      clickhouse: clickHouseEventSink,
      console: consoleEventSink,
    };

    const configuredSinkNames = kovaa-labConfigService.get('EVENT_SINKS');

    const unknownSinkNames = configuredSinkNames.filter(
      (name) => !KNOWN_SINK_NAMES.includes(name.toLowerCase() as never),
    );

    if (unknownSinkNames.length > 0) {
      new Logger('WorkspaceEventSinks').warn(
        `Ignoring unknown EVENT_SINKS: ${unknownSinkNames.join(', ')}`,
      );
    }

    return getAvailableSinkNames(configuredSinkNames, {
      hasClickhouseUrl: Boolean(kovaa-labConfigService.get('CLICKHOUSE_URL')),
    })
      .map((name) => sinkByName[name.toLowerCase()])
      .filter(isDefined);
  },
  inject: [KovaaLab CRMConfigService, ClickHouseEventSink, ConsoleEventSink],
};

@Module({
  imports: [ClickHouseModule, EventLogLiveModule],
  providers: [
    ClickHouseEventSink,
    ConsoleEventSink,
    eventSinksProvider,
    WorkspaceEventSinkService,
    CreateEventLogFromInternalEvent,
    ForwardEventLogFromEntityEventsToDbQueue,
  ],
  exports: [WorkspaceEventSinkService],
})
export class EventLogIngestionModule {}
