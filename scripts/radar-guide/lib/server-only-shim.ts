/**
 * Lets the radar-guide commands import lib/radar-guides/registry.server under
 * tsx. Next resolves `server-only` itself; plain Node cannot find it. Import
 * this module before anything that imports registry.server: it maps
 * `server-only` to this (empty) module. CommonJS only, which is how tsx runs
 * these scripts.
 */
import Module from "node:module";

const M = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const original = M._resolveFilename;
if (!(original as { __radarShim?: boolean }).__radarShim) {
  const patched = function (this: unknown, request: string, ...rest: unknown[]) {
    if (request === "server-only") return __filename;
    return original.call(this, request, ...rest);
  };
  (patched as { __radarShim?: boolean }).__radarShim = true;
  M._resolveFilename = patched;
}

export {};
