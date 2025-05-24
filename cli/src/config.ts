import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import c from 'picocolors';
import { exists } from './utils.ts';
import { withType } from './logger.ts';

// Configuration file paths
export function getUserConfigPath() {
  // Check for environment variable override
  const userConfigDir = process.env.JSPM_USER_CONFIG_DIR || path.join(os.homedir(), '.jspm');
  return path.join(userConfigDir, 'config');
}

// Simple configuration schema with provider configs
export interface JspmConfig {
  providers?: Record<string, any>;
  defaultPublishProvider?: string;
  defaultProvider?: string;
  cacheDir?: string;
}

/**
 * Find local .jspmrc file by checking current directory and parent directories
 */
async function findLocalConfig(startDir: string = process.cwd()): Promise<string | null> {
  const log = withType('config/findLocalConfig');

  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  // Check current directory and each parent up to the root
  while (currentDir !== root) {
    const configPath = path.join(currentDir, '.jspmrc');
    log(`Checking for config at ${configPath}`);

    if (await exists(configPath)) {
      log(`Found local config at ${configPath}`);
      return configPath;
    }

    // Move up to parent directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // We've reached the root
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * Loads configuration from user and local paths
 * with local overriding user
 *
 * @param scope Which config to load: 'both' (default), 'user', or 'local'
 */
export async function loadConfig(scope: 'both' | 'user' | 'local' = 'both'): Promise<JspmConfig> {
  const log = withType('config/loadConfig');

  const configs: JspmConfig[] = [];

  // Load user config if requested
  if (scope === 'both' || scope === 'user') {
    const userConfigPath = getUserConfigPath();
    if (await exists(userConfigPath)) {
      try {
        log(`Loading user config from ${userConfigPath}`);
        const configStr = await fs.readFile(userConfigPath, 'utf8');
        const config = JSON.parse(configStr);
        configs.push(config);
      } catch (err) {
        log(`Error loading user config: ${err.message}`);
        console.warn(`${c.yellow('Warning:')} Could not read user config at ${userConfigPath}.`);
      }
    }
  }

  // Load local config if requested and it exists
  if (scope === 'both' || scope === 'local') {
    const localConfigPath = await findLocalConfig();
    if (localConfigPath) {
      try {
        log(`Loading local config from ${localConfigPath}`);
        const configStr = await fs.readFile(localConfigPath, 'utf8');
        const config = JSON.parse(configStr);
        configs.push(config);
      } catch (err) {
        log(`Error loading local config: ${err.message}`);
        console.warn(`${c.yellow('Warning:')} Could not read local config at ${localConfigPath}.`);
      }
    }
  }

  // Merge configs with local taking precedence over user
  return configs.reduce((merged, config) => mergeConfigs(merged, config), {});
}

/**
 * Saves configuration to the specified scope
 */
export async function saveConfig(
  config: JspmConfig,
  scope: 'user' | 'local' = 'user'
): Promise<void> {
  const log = withType('config/saveConfig');

  const configPath = scope === 'user' ? getUserConfigPath() : path.join(process.cwd(), '.jspmrc');

  try {
    // Ensure directory exists for user config
    if (scope === 'user') {
      const configDir = path.dirname(configPath);
      await fs.mkdir(configDir, { recursive: true });
    }

    // Save config
    log(`Saving ${scope} config to ${configPath}`);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    log(`Error saving ${scope} config: ${err.message}`);
    throw new Error(`Failed to save ${scope} config at ${configPath}: ${err.message}`);
  }
}

/**
 * Updates a specific part of the configuration
 */
export async function updateConfig(
  updates: Partial<JspmConfig>,
  scope: 'user' | 'local' = 'user'
): Promise<JspmConfig> {
  // For local config updates, we first check if a .jspmrc already exists in the path
  if (scope === 'local') {
    const localConfigPath = await findLocalConfig();
    if (localConfigPath && path.dirname(localConfigPath) !== process.cwd()) {
      throw new Error(
        `Found existing .jspmrc at ${localConfigPath}. ` +
          `Use that file instead or remove it before creating one in the current directory.`
      );
    }
  }

  // Load existing config
  const config = await loadConfig();

  // Create updated config
  const updatedConfig = mergeConfigs(config, updates);

  // Save updated config
  await saveConfig(updatedConfig, scope);

  return updatedConfig;
}

/**
 * Helper to merge configuration objects
 */
function mergeConfigs(target: JspmConfig, source: Partial<JspmConfig>): JspmConfig {
  const result = { ...target };

  // Merge provider configs
  if (source.providers) {
    result.providers = result.providers || {};

    for (const [provider, config] of Object.entries(source.providers)) {
      result.providers[provider] = {
        ...result.providers[provider],
        ...config
      };
    }
  }

  // Override simple properties
  if (source.defaultProvider !== undefined) {
    result.defaultProvider = source.defaultProvider;
  }

  if (source.cacheDir !== undefined) {
    result.cacheDir = source.cacheDir;
  }

  return result;
}

/**
 * Sets a config value using dot notation
 * @param key Config key (dot notation)
 * @param value Value to set
 * @param local Whether to set in local config
 */
export async function setConfig(key: string, value: any, local = false): Promise<void> {
  const log = withType('config/setConfig');
  log(`Setting ${key}=${value} in ${local ? 'local' : 'user'} config`);

  // Handle provider config specially
  if (key.includes('.')) {
    const [provider, configKey] = key.split('.', 2);

    // Create update object with nested structure
    const update: Partial<JspmConfig> = {
      providers: {
        [provider]: {
          [configKey]: value
        }
      }
    };

    await updateConfig(update, local ? 'local' : 'user');
  } else {
    // Handle top-level configs
    const update: Partial<JspmConfig> = {
      [key]: value
    };

    await updateConfig(update, local ? 'local' : 'user');
  }
}

/**
 * Gets a config value using dot notation
 * @param key Config key (dot notation)
 * @returns Value or undefined if not found
 */
export async function getConfig(key: string): Promise<any> {
  const config = await loadConfig();

  // Handle provider config specially
  if (key.includes('.')) {
    const [provider, configKey] = key.split('.', 2);
    return config.providers?.[provider]?.[configKey];
  }

  // Handle top-level configs
  return config[key];
}
