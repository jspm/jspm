/**
 * Copyright 2022-2025 Guy Bedford
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import c from "picocolors";
import open from "open";
import { JspmError, availableProviders, getGenerator } from "./utils.ts";
import { loadConfig, saveConfig } from "./config.ts";
import type { BaseFlags } from "./cli.ts";

export interface AuthProviderFlags extends BaseFlags {
  username?: string;
  open?: boolean;
}

export async function list(): Promise<void> {
  console.log(`${c.magenta(c.bold("Available providers:"))}`);

  // Get the list of available providers
  const providers = availableProviders.filter(
    (provider) => !provider.includes("#")
  );

  // Load the configuration to check which providers have auth tokens
  const config = await loadConfig();
  const configuredProviders = config.providers || {};

  // Display each provider with its authentication status
  for (const provider of providers) {
    const isAuthenticated = !!configuredProviders[provider]?.authToken;
    const authStatus = isAuthenticated
      ? c.green("authenticated")
      : c.yellow("not authenticated");

    console.log(`  ${c.cyan(provider)} ${c.dim("→")} ${authStatus}`);
  }

  console.log();
  console.log(
    `${c.blue("Info:")} Use ${c.bold(
      "jspm auth <provider>"
    )} to authenticate with a provider.`
  );
}

export async function provider(
  providerName: string,
  flags: AuthProviderFlags = {}
): Promise<void> {
  const { username, open: shouldOpen = true } = flags;

  if (!providerName) {
    throw new JspmError(
      "You must specify a provider to authenticate with. Try 'jspm auth provider jspm.io'"
    );
  }

  const generator = await getGenerator(flags);

  // Call the generator's auth method with a verification callback
  try {
    const result = await generator.auth({
      provider: providerName,
      username,
      verify: (url: string, instructions: string) => {
        console.log(`To authenticate with ${providerName}:`);
        console.log(`${c.bold(c.blue(url))}`);
        console.log(`${instructions}\n`);

        // Automatically open the URL in the browser if not disabled
        if (shouldOpen) {
          open(url).catch(() => {
            console.log(
              "Could not open the URL automatically. Please open it manually."
            );
          });
        }
      },
    });

    // Store the token in the JSPM configuration
    if (result && result.token) {
      // Get the normalized provider name (strip any #layer suffix)
      const provider = providerName.split("#")[0];

      // Load user config only (not local)
      const config = await loadConfig("user");

      // Ensure providers object exists
      if (!config.providers) {
        config.providers = {};
      }

      // Ensure provider object exists
      if (!config.providers[provider]) {
        config.providers[provider] = {};
      }

      // Set the auth token
      config.providers[provider].authToken = result.token;

      // Save the config back to user scope
      await saveConfig(config, "user");

      console.log(`${c.green("Ok:")} Authentication successful`);
      console.log(
        `${c.blue(
          "Info:"
        )} Token saved in JSPM configuration for provider '${provider}'`
      );
    } else {
      console.log(
        `${c.yellow(
          "Warning:"
        )} Authentication completed but no token was returned`
      );
    }
  } catch (error) {
    if (error.message?.includes("does not support authentication")) {
      throw new JspmError(
        `Provider "${providerName}" does not support authentication.`
      );
    }
    throw error;
  }
}
