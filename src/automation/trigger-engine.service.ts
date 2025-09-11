// trigger-engine.service.ts
import { Injectable } from '@nestjs/common';
import jsonLogic from 'json-logic-js';
import { EventEmitter2 } from '@nestjs/event-emitter';

type TriggerEnvelope =
  | { type: 'jsonlogic'; logic: any; actionsOnMet?: any[] }
  | { type: 'time'; after: string; from?: string; actionsOnMet?: any[] }
  | { type: 'event'; eventName: string; where?: any; actionsOnMet?: any[] };

@Injectable()
export class TriggerEngineService {
  constructor(private emitter: EventEmitter2 /* inject queue service too */) {}

  async evaluate(trigger: TriggerEnvelope, context: any) {
    switch (trigger.type) {
      case 'jsonlogic': {
        const met = !!jsonLogic.apply(trigger.logic, context);
        if (met) await this.executeActions(trigger.actionsOnMet, context);
        return met;
      }
      case 'time': {
        // schedule a delayed job (BullMQ) or a delayed message (RabbitMQ)
        // compute base time from context with trigger.from
        // queueService.schedule(trigger.after, { trigger, context });
        return false; // will be met later by scheduler
      }
      case 'event': {
        // event wiring is configured at bootstrap; here you can optionally do nothing.
        return false;
      }
    }
  }

  private async executeActions(actions: any[] = [], ctx: any) {
    for (const a of actions) {
      if (a.emit) this.emitter.emit(a.emit, ctx);
      if (a.enqueue) {
        // queueService.enqueue(a.enqueue.queue, a.enqueue.job, ctx);
      }
    }
  }
}
