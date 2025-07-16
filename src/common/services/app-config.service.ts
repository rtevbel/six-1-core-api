import { ConfigService } from '@nestjs/config';

/**
 * Application custom config service class.
 *
 * @version 0.0.1
 *
 * This service class extends ConfigService class,
 * of ConfigMoudle and provides custom method to add,
 * or override environment variables at runtime.
 */
export class AppConfigService extends ConfigService {
  constructor() {
    /**
     * @todo Needs to read all secrets from underlying platform,
     *  (eg. Docker swarm or K8s) to runtimeEnvVars object for application's
     *  use.
     */
    super();
  }
  //Class environment variables object
  private runtimeEnvVars: Record<string, any> = {};

  /**
   *  Method to add or override environment variables.
   *
   * @version 0.0.1
   *
   * @param {string} key -Envrionment variable key.
   * @param {any} value -Envrionment variable value to set.
   * @returns {void}   -Returns nothing
   */
  set(key: string, value: any): void {
    this.runtimeEnvVars[key] = value;
  }

  /**
   *  Override the get method to include runtime variables
   *
   * @version 0.0.1
   *
   * @param {string} key -Envrionment variable key.
   * @param {any} defaultValue -Default value of environment variable.
   * @returns {T}  -Returns either a value found in runtimeEnvVars or,
   * in default environment variables against provided key or passed,
   * a default value.
   *
   */
  get<T = any>(key: string, defaultValue?: T): T | undefined {
    let value: T | undefined;

    if (key in this.runtimeEnvVars) {
      value = this.runtimeEnvVars[key];
    } else if (defaultValue !== undefined) {
      value = super.get<T>(key, defaultValue);
    } else {
      value = super.get<T>(key);
    }

    return value;
  }
}
