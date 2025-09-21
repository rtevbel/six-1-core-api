import { Injectable, Inject } from '@nestjs/common';
import jsonLogic from 'json-logic-js';
import { EventsService } from '../events/events.service';
import { SCHEDULER_PORT, SchedulerPort } from './scheduler.port';

type JsonLogicTrigger = { type: 'jsonlogic'; logic: any; actionsOnMet?: Action[] };
type TimeTrigger = { type: 'time'; after: string; from?: string; actionsOnMet?: Action[] }; // after: "PT24H"
type EventTrigger = { type: 'event'; eventName: string; where?: any; actionsOnMet?: Action[] };
type TriggerEnvelope = JsonLogicTrigger | TimeTrigger | EventTrigger;

type Action =
  | { emit: string }
  | { enqueue: { queue: string; job: string; payload?: any; delayMs?: number } };

@Injectable()
export class TriggerEngineService {
  constructor(
    private readonly events: EventsService,
    @Inject(SCHEDULER_PORT) private readonly scheduler: SchedulerPort,
  ) {}

  async evaluate(trigger: TriggerEnvelope, context: any): Promise<boolean> {
    switch (trigger.type) {
      case 'jsonlogic': {
        const met = !!jsonLogic.apply(trigger.logic, context);
        if (met) await this.execActions(trigger.actionsOnMet, context);
        return met;
      }
      case 'time': {
        const delayMs = this.isoDurationToMs(trigger.after);
        if (!delayMs) return false;
        await this.scheduler.schedule(delayMs, 'time-trigger', { trigger, context });
        return false;
      }
      case 'event': {
        // Wired by event bridge; nothing here
        return false;
      }
    }
  }

  private async execActions(actions: Action[] = [], ctx: any) {
    for (const a of actions) {
      if ('emit' in a) await this.events.emitAsync(a.emit, { data: ctx, entity: { entityType: 'Process', entityId: ctx.processInstanceId } });
      if ('enqueue' in a) await this.scheduler.schedule(a.enqueue.delayMs ?? 0, `${a.enqueue.queue}:${a.enqueue.job}`, a.enqueue.payload ?? ctx);
    }
  }

  private isoDurationToMs(duration: string): number {
    const m = /^P(T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)$/.exec(duration);
    if (!m) return 0;
    const h = parseInt(m[2] ?? '0', 10);
    const min = parseInt(m[3] ?? '0', 10);
    const s = parseInt(m[4] ?? '0', 10);
    return ((h * 60 + min) * 60 + s) * 1000;
  }
}
