import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CONFIG_VERIFICATION_RATE_LIMIT_ENABLED_KEY,
  CONFIG_VERIFICATION_RATE_LIMIT_MAX_CLIENT_ATTEMPTS_KEY,
  CONFIG_VERIFICATION_RATE_LIMIT_MAX_TOKEN_ATTEMPTS_KEY,
  CONFIG_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS_KEY,
  DEFAULT_CONFIG_VERIFICATION_RATE_LIMIT_MAX_CLIENT_ATTEMPTS,
  DEFAULT_CONFIG_VERIFICATION_RATE_LIMIT_MAX_TOKEN_ATTEMPTS,
  DEFAULT_CONFIG_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS,
} from './config-verification-platform.constants';
import { verificationTokenFingerprint } from './verification-token-fingerprint.util';

export interface ConfigVerificationRateLimitCheckParams {
  objectType: string;
  token: string;
  clientKey?: string | null;
}

export interface ConfigVerificationRateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimitBucket {
  timestamps: number[];
}

/**
 * In-process sliding-window rate limiter for public verify RPC (Phase 8).
 * Gateway should still enforce edge limits; this protects core-api from brute force.
 */
@Injectable()
export class ConfigVerificationRateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(private readonly configService: ConfigService) {}

  checkAndRecord(
    params: ConfigVerificationRateLimitCheckParams,
  ): ConfigVerificationRateLimitCheckResult {
    if (!this.isEnabled()) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const windowMs = this.windowSeconds() * 1000;
    const clientKey = params.clientKey?.trim() || 'anonymous';
    const tokenFingerprint = verificationTokenFingerprint(params.token);
    const objectType = params.objectType.trim();

    const clientResult = this.consume(
      `client:${clientKey}:${objectType}`,
      this.maxClientAttempts(),
      windowMs,
    );
    if (!clientResult.allowed) {
      return clientResult;
    }

    return this.consume(
      `token:${tokenFingerprint}:${objectType}`,
      this.maxTokenAttempts(),
      windowMs,
    );
  }

  private consume(
    bucketKey: string,
    maxAttempts: number,
    windowMs: number,
  ): ConfigVerificationRateLimitCheckResult {
    const now = Date.now();
    const bucket = this.buckets.get(bucketKey) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

    if (bucket.timestamps.length >= maxAttempts) {
      const oldest = bucket.timestamps[0] ?? now;
      const retryAfterMs = Math.max(0, windowMs - (now - oldest));
      this.buckets.set(bucketKey, bucket);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    bucket.timestamps.push(now);
    this.buckets.set(bucketKey, bucket);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private isEnabled(): boolean {
    const raw = this.configService.get<string>(
      CONFIG_VERIFICATION_RATE_LIMIT_ENABLED_KEY,
    );
    if (raw == null || String(raw).trim() === '') {
      return true;
    }
    return ['true', '1', 'yes', 'on'].includes(
      String(raw).trim().toLowerCase(),
    );
  }

  private windowSeconds(): number {
    return (
      Number(
        this.configService.get(
          CONFIG_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS_KEY,
        ),
      ) || DEFAULT_CONFIG_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS
    );
  }

  private maxClientAttempts(): number {
    return (
      Number(
        this.configService.get(
          CONFIG_VERIFICATION_RATE_LIMIT_MAX_CLIENT_ATTEMPTS_KEY,
        ),
      ) || DEFAULT_CONFIG_VERIFICATION_RATE_LIMIT_MAX_CLIENT_ATTEMPTS
    );
  }

  private maxTokenAttempts(): number {
    return (
      Number(
        this.configService.get(
          CONFIG_VERIFICATION_RATE_LIMIT_MAX_TOKEN_ATTEMPTS_KEY,
        ),
      ) || DEFAULT_CONFIG_VERIFICATION_RATE_LIMIT_MAX_TOKEN_ATTEMPTS
    );
  }
}
