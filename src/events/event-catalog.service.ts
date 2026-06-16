import { Injectable } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import {
  getPlatformEventCatalogSeedEntry,
  resolveCanonicalEventName,
} from './seed/platform-event-catalog.seed';
import { DEFAULT_EVENT_SCHEMA_VERSION } from './constants/event-catalog.constants';

/**
 * Platform event catalog — resolves event IDs by name with in-memory caching.
 * Auto-registers unknown events using seed metadata when available (P0.2).
 */
@Injectable()
export class EventCatalogService {
  private readonly cache = new Map<string, number>();

  constructor(private readonly eventsService: EventsService) {}

  /**
   * Returns the catalog row id for an event name, creating a row when absent.
   */
  async getIdByName(eventName: string): Promise<number> {
    const cached = this.cache.get(eventName);
    if (cached) {
      return cached;
    }

    let id = await this.eventsService.findIdByNameOrNull(eventName);
    if (!id) {
      id = await this.createInDb(eventName);
    }

    this.cache.set(eventName, id);
    return id;
  }

  /**
   * Resolves deprecated `six1-event.notification.*` names to canonical catalog names.
   */
  resolveCanonicalEventName(eventName: string): string {
    return resolveCanonicalEventName(eventName);
  }

  /**
   * Clears the in-memory name → id cache (for tests).
   */
  clearCache(): void {
    this.cache.clear();
  }

  private async createInDb(eventName: string): Promise<number> {
    const seed = getPlatformEventCatalogSeedEntry(eventName);
    const createDto: CreateEventDto = seed
      ? {
          name: seed.name,
          description: seed.description,
          category: seed.category,
          schemaVersion: seed.schemaVersion ?? DEFAULT_EVENT_SCHEMA_VERSION,
          payloadSchema: seed.payloadSchema,
          isSystem: seed.isSystem,
          createdBy: 1,
        }
      : {
          name: eventName,
          description: eventName,
          createdBy: 1,
        };

    const eventData = await this.eventsService.create(1, createDto);
    return eventData.eventId ?? 0;
  }
}
