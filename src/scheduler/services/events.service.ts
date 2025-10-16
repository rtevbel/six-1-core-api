import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledTaskEventsEntity } from '../entities/scheduled_task_event.entity';

/**
 * EventsService is responsible for managing and emitting events related to scheduled tasks.
 * It records events in the database for tracking and auditing purposes.
 */
@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(ScheduledTaskEventsEntity)
    private readonly repo: Repository<ScheduledTaskEventsEntity>, // Repository for scheduled task events
  ) {}

  /**
   * Emits an event for a scheduled task by creating and saving an event record in the database.
   * @param scheduledTaskId - The ID of the scheduled task associated with the event.
   * @param kind - The type or kind of the event (e.g., status change, task completion).
   * @param details - Optional additional details about the event.
   * @param jobId - Optional job ID associated with the event.
   */
  async emit(
    scheduledTaskId: number,
    kind: ScheduledTaskEventsEntity['kind'],
    details?: any,
    jobId?: string | null,
  ) {
    // Create and save a new event record with the provided details
    await this.repo.save(
      this.repo.create({
        scheduledTaskId, // ID of the scheduled task
        kind, // Type of the event
        whenUtc: new Date(), // Timestamp of when the event occurred (UTC)
        details: details ?? null, // Additional details about the event (if any)
        jobId: jobId ?? null, // Job ID associated with the event (if any)
      }),
    );
  }
}