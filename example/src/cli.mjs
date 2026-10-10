#!/usr/bin/env node
import { greet } from './greet.mjs';

console.log(greet(process.argv[2]));
