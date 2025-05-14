import c from "picocolors";
import { loadConfig, saveConfig, updateConfig } from "./config.ts";
import { JspmError } from "./utils.ts";
import type { ConfigFlags } from "./cli.ts";

// Define the interface locally to match the one in config.ts
interface JspmConfig {
  providers?: Record<string, any>;
  defaultProvider?: string;
  cacheDir?: string;
}

/**
 * Implements the config command for JSPM CLI
 */
export default async function configCmd(
  action: string,
  configKey: string,
  value: string | undefined,
  flags: ConfigFlags
): Promise<void> {
  const scope = flags.local ? "local" : "user";

  // Handle provider flag if present
  if (flags.provider) {
    // Prepend the providers.<provider> prefix to the key, with quotes for provider
    // This handles providers with dots in their names (e.g., "jspm.io")
    if (configKey && action !== "list" && action !== "ls") {
      configKey = `providers.'${flags.provider}'.${configKey}`;
    } else if (action === "get" || action === "delete" || action === "rm") {
      configKey = `providers.'${flags.provider}'`;
    }
  }

  switch (action) {
    case "get":
      await getConfig(configKey, flags);
      break;
    case "set":
      if (value === undefined) {
        throw new JspmError(`The 'set' action requires a value parameter.`);
      }
      await setConfig(configKey, value, scope, flags);
      break;
    case "delete":
    case "rm":
      await deleteConfig(configKey, scope, flags);
      break;
    case "list":
    case "ls":
      if (flags.provider) {
        await getConfig(`providers.'${flags.provider}'`, flags);
      } else {
        await listConfig(flags);
      }
      break;
    default:
      throw new JspmError(
        `Unknown config action: ${action}. Valid actions are: get, set, delete, list`
      );
  }
}

/**
 * Display a configuration value
 */
async function getConfig(key: string, flags: ConfigFlags): Promise<void> {
  const config = await loadConfig();
  const value = getConfigValue(config, key);

  if (value === undefined) {
    if (!flags.silent) {
      console.log(
        `${c.yellow("Warning:")} Configuration key '${key}' is not set.`
      );
    }
    return;
  }

  // For primitive values, display directly; for objects, format as JSON
  const displayValue =
    typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);

  if (!flags.silent) {
    console.log(displayValue);
  }
}

/**
 * Set a configuration value
 */
async function setConfig(
  key: string,
  value: string,
  scope: "user" | "local",
  flags: ConfigFlags
): Promise<void> {
  let parsedValue: any;

  // Try to parse as JSON first, fallback to string
  try {
    parsedValue = JSON.parse(value);
  } catch (e) {
    parsedValue = value;
  }

  // Create updates object with nested path
  const updates: JspmConfig = {};
  setConfigValue(updates, key, parsedValue);

  try {
    await updateConfig(updates, scope);

    if (!flags.silent) {
      console.log(
        `${c.green("Ok:")} Set ${scope} config ${c.cyan(key)} to ${
          typeof parsedValue === "object"
            ? JSON.stringify(parsedValue)
            : parsedValue
        }`
      );
    }
  } catch (err) {
    throw new JspmError(`Failed to update configuration: ${err.message}`);
  }
}

/**
 * Delete a configuration value
 */
async function deleteConfig(
  key: string,
  scope: "user" | "local",
  flags: ConfigFlags
): Promise<void> {
  const config = await loadConfig();

  // Check if the key exists
  if (getConfigValue(config, key) === undefined) {
    if (!flags.silent) {
      console.log(
        `${c.yellow("Warning:")} Configuration key '${key}' does not exist.`
      );
    }
    return;
  }

  // Delete the key
  deleteConfigValue(config, key);

  // Save the updated config
  try {
    await saveConfig(config, scope);

    if (!flags.silent) {
      console.log(
        `${c.green("Ok:")} Deleted ${scope} config key ${c.cyan(key)}`
      );
    }
  } catch (err) {
    throw new JspmError(`Failed to update configuration: ${err.message}`);
  }
}

/**
 * List all configuration values
 */
async function listConfig(flags: ConfigFlags): Promise<void> {
  const config = await loadConfig();

  if (Object.keys(config).length === 0) {
    if (!flags.silent) {
      console.log(`No configuration values set.`);
    }
    return;
  }

  if (!flags.silent) {
    console.log(JSON.stringify(config, null, 2));
  }
}

/**
 * Helper to parse a key string with dot notation, handling quoted segments
 * @param key The dot-notated key string, with optional quoted parts
 * @returns Array of key parts
 */
function parseKeyParts(key: string): string[] {
  const parts: string[] = [];
  let currentPart = "";
  let inQuote = false;
  let quoteChar = "";

  // Parse the key character by character to properly handle quoted segments
  for (let i = 0; i < key.length; i++) {
    const char = key[i];

    if ((char === "'" || char === '"') && (i === 0 || key[i - 1] !== "\\")) {
      // Handle start/end of quotes
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
        quoteChar = "";
      } else {
        // Different quote character inside quotes - treat as literal
        currentPart += char;
      }
    } else if (char === "." && !inQuote) {
      // End of a part (if not in quotes)
      parts.push(currentPart);
      currentPart = "";
    } else {
      // Normal character
      currentPart += char;
    }
  }

  // Add the last part
  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}

/**
 * Helper to get a nested configuration value using dot notation
 */
function getConfigValue(config: any, key: string): any {
  const parts = parseKeyParts(key);
  let current = config;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

/**
 * Helper to set a nested configuration value using dot notation
 */
function setConfigValue(obj: any, key: string, value: any): void {
  const parts = parseKeyParts(key);
  let current = obj;

  // Navigate to the last part's parent
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  // Set the value on the last part
  current[parts[parts.length - 1]] = value;
}

/**
 * Helper to delete a nested configuration value using dot notation
 */
function deleteConfigValue(obj: any, key: string): void {
  const parts = parseKeyParts(key);
  let current = obj;

  // Navigate to the last part's parent
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      return; // Key doesn't exist, nothing to delete
    }
    current = current[part];
  }

  // Delete the value on the last part
  delete current[parts[parts.length - 1]];
}
