/**
 * Public surface for the on-disk data layer.
 *
 * Backed by the file-system "database" described in
 * `docs/architecture/data-model.md`. All disk paths resolve through
 * `../paths.ts`, all writes go through `./atomic.ts`.
 */

export {
  listLibrary,
  getLibraryEntry,
  getLibraryMeta,
  getLibraryAnimation,
  saveLibraryMeta,
  libraryEntryExists,
  deleteLibraryEntry,
} from "./library.ts";

export {
  listGenerations,
  getGeneration,
  createGeneration,
  updateGenerationMeta,
  writeGenerationVersion,
  setGenerationStatus,
  getGenerationFinalAnimation,
  deleteGeneration,
} from "./generations.ts";

export { appendDecision, tailDecisions } from "./decisions.ts";

export { promoteGenerationToLibrary } from "./promote.ts";

export {
  writeFileAtomic,
  writeJsonAtomic,
  appendJsonl,
  readJson,
  pathExists,
} from "./atomic.ts";

export type * from "./types.ts";
