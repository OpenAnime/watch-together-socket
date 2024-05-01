#!/usr/bin/env node
import RapidEnv from 'rapidenv';

RapidEnv().load();

await import('../dist/index.js');
