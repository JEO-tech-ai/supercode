#!/usr/bin/env bun

/**
 * Development Setup Script
 * Configures TypeScript paths and starts development server
 */
import { $ } from "bun";

// Install TypeScript path mappings if needed
const tsconfigPath = new URL("../tsconfig.json", import.meta.url);

console.log("🚀 Setting up development environment...");

// Start development server with hot reload
$`bun --hot src/cli/index.ts`;
