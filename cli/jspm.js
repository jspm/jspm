#!/usr/bin/env node
import c from "picocolors";
import { cli } from './src/cli.ts';

try {
  cli.parse();
} catch (e) {
  if (e.constructor.name === "CACError")
    console.error(`${c.red("Err:")} ${e.message}\n`);
}
