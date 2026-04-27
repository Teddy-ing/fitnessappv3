/**
 * Import Parsers — Barrel Export
 *
 * Provides a unified `parseFile()` dispatcher that delegates
 * to the appropriate parser based on competitor source.
 */

import type { CompetitorSource, ParseResult } from './types';
import { parseHevyFiles } from './hevyParser';
import { parseStrongFiles } from './strongParser';
import { parseFitNotesFiles } from './fitnotesParser';

export { generateExerciseMappings, allMappingsResolved, getUnresolvedMappings } from './exerciseMapper';
export type {
    CompetitorSource,
    ParseResult,
    ParsedWorkout,
    ParsedExercise,
    ParsedSet,
    ParsedMeasurement,
    ExerciseMapping,
    ImportSummary,
    ImportResult,
} from './types';

/**
 * Parse competitor CSV files from a given source.
 *
 * @param source - Which competitor app the files came from
 * @param fileUris - Array of file URI strings (from document picker)
 * @returns Standardized parse result with workouts, measurements, and warnings
 */
export async function parseFile(
    source: CompetitorSource,
    fileUris: string[],
): Promise<ParseResult> {
    switch (source) {
        case 'hevy':
            return parseHevyFiles(fileUris);
        case 'strong':
            return parseStrongFiles(fileUris);
        case 'fitnotes':
            return parseFitNotesFiles(fileUris);
        default:
            return { workouts: [], measurements: [], warnings: [`Unknown source: ${source}`] };
    }
}
