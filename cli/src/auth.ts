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
import { JspmError, getGenerator } from "./utils.ts";
import { loadConfig, saveConfig } from "./config.ts";
import type { BaseFlags } from "./cli.ts";

export interface AuthFlags extends BaseFlags {
  provider?: string;
  username?: string;
  open?: boolean;
}

export default async function auth(flags: AuthFlags): Promise<void> {
  const { provider, username, open: shouldOpen = true } = flags;
  
  if (!provider) {
    throw new JspmError(
      "You must specify a provider to authenticate with. Try 'jspm auth --provider jspm.io'"
    );
  }

  const generator = await getGenerator(flags);

  // Call the generator's auth method with a verification callback
  try {
    const result = await generator.auth({
      provider,
      username,
      verify: (url: string, instructions: string) => {
        console.log(`To authenticate with ${provider}:`);
        console.log(`${c.bold(c.blue(url))}`);
        console.log(`${instructions}\n`);
        
        // Automatically open the URL in the browser if not disabled
        if (shouldOpen) {
          open(url).catch(() => {
            console.log("Could not open the URL automatically. Please open it manually.");
          });
        }
      }
    });

    // Store the token in the JSPM configuration
    if (result && result.token) {
      // Get the normalized provider name (strip any #layer suffix)
      const providerName = provider.split('#')[0];
      
      // Load user config only (not local)
      const config = await loadConfig('user');
      
      // Ensure providers object exists
      if (!config.providers) {
        config.providers = {};
      }
      
      // Ensure provider object exists
      if (!config.providers[providerName]) {
        config.providers[providerName] = {};
      }
      
      // Set the auth token
      config.providers[providerName].authToken = result.token;
      
      // Save the config back to user scope
      await saveConfig(config, 'user');
      
      console.log(`${c.green('Ok:')} Authentication successful`);
      console.log(`${c.blue('Info:')} Token saved in JSPM configuration for provider '${providerName}'`);
    } else {
      console.log(`${c.yellow('Warn:')} Authentication completed but no token was returned`);
    }
  } catch (error) {
    if (error.message?.includes("does not support authentication")) {
      throw new JspmError(`Provider "${provider}" does not support authentication.`);
    }
    throw error;
  }
  
  // Return to make typechecking happy, but the command doesn't need to return anything
  
}