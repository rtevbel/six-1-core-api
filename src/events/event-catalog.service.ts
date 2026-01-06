import { Injectable } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

/**
 * Service for managing and caching event IDs based on event names.
 * This service provides functionality to retrieve event IDs from a database
 * or create new entries for unknown events, with caching for performance.
 */
@Injectable()
export class EventCatalogService {
  // In-memory cache to store event name-to-ID mappings
  private cache = new Map<string, number>();

  /**
   * Constructor for the EventCatalogService.
   * Dependencies such as a repository, database client, or cache client
   * (e.g., Redis) can be injected here as needed.
   */
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Retrieves the ID of an event by its name. If the event is not found in the cache,
   * it attempts to fetch it from the database. If the event is still not found,
   * it optionally creates a new entry in the database.
   *
   * @param eventName - The name of the event.
   * @returns A promise that resolves to the event ID.
   */
  async getIdByName(eventName: string): Promise<number> {
    // Check if the event ID is already cached
    const cached = this.cache.get(eventName);
    if (cached) return cached;

    // 1) Attempt to find the event ID in the database
    let id = await this.findIdInDb(eventName);

    // 2) If the event is not found, optionally create a new entry in the database
    if (!id) id = await this.createInDb(eventName);

    // Cache the event ID for future lookups
    this.cache.set(eventName, id);
    return id;
  }

  /**
   * Attempts to find the ID of an event in the database by its name.
   *
   * @param eventName - The name of the event.
   * @returns A promise that resolves to the event ID, or null if not found.
   */
  private async findIdInDb(eventName: string): Promise<number | null> {
    return await this.eventsService.findIdByName(1, eventName);
  }

  /**
   * Creates a new event entry in the database and returns its ID.
   *
   * @param eventName - The name of the event to create.
   * @returns A promise that resolves to the newly created event ID.
   */
  private async createInDb(eventName: string): Promise<number> {
    const creatDto: CreateEventDto = {
      name: eventName,
      description: eventName,
      createdBy: 1,
    };

    const eventData = await this.eventsService.create(1, creatDto);
    return eventData.eventId ?? 0;
  }
}
