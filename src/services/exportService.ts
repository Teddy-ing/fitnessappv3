/**
 * Export Service
 *
 * Generates a formatted .xlsx spreadsheet export with 4 sheets:
 * Workouts, Measurements, Goals, Personal Records.
 *
 * Also provides the data query functions for each sheet.
 * Uses the xlsx (SheetJS) library for workbook generation.
 */

import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDatabase } from './database';
import { formatISODate } from '../utils/formatters';
import { displayWeight } from '../utils/unitConversion';
import { getSettings } from './preferencesService';

// ============================================================
// Row types for SQL queries
// ============================================================

interface WorkoutExportRow {
    completed_at: string;
    workout_name: string;
    exercise_name: string;
    set_number: number;
    set_type: string;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    note: string | null;
}

interface MeasurementExportRow {
    recorded_at: string;
    metric_name: string;
    value: number;
    unit: string;
}

interface GoalExportRow {
    label: string | null;
    goal_type: string;
    target_value: number;
    current_best: number | null;
    starting_value: number | null;
    status: string;
    deadline: string | null;
}

interface RecordExportRow {
    exercise_name: string;
    reps: number | null;
    weight: number | null;
    value: number;
    achieved_at: string;
}

// ============================================================
// Data Queries
// ============================================================

async function getWorkoutExportData(): Promise<WorkoutExportRow[]> {
    const db = await getDatabase();
    if (!db) return [];

    return db.getAllAsync<WorkoutExportRow>(`
        SELECT
            w.completed_at,
            w.name AS workout_name,
            we.exercise_name,
            ws.order_index + 1 AS set_number,
            ws.type AS set_type,
            ws.weight,
            ws.reps,
            ws.rpe,
            ws.note
        FROM workouts w
        JOIN workout_exercises we ON we.workout_id = w.id
        JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.status = 'completed'
        ORDER BY w.completed_at DESC, we.order_index ASC, ws.order_index ASC
    `);
}

async function getMeasurementExportData(): Promise<MeasurementExportRow[]> {
    const db = await getDatabase();
    if (!db) return [];

    return db.getAllAsync<MeasurementExportRow>(`
        SELECT
            m.recorded_at,
            mt.name AS metric_name,
            m.value,
            mt.unit_imperial AS unit
        FROM measurements m
        JOIN measurement_types mt ON mt.id = m.measurement_type_id
        ORDER BY m.recorded_at DESC
    `);
}

async function getGoalExportData(): Promise<GoalExportRow[]> {
    const db = await getDatabase();
    if (!db) return [];

    return db.getAllAsync<GoalExportRow>(`
        SELECT
            label,
            goal_type,
            target_value,
            current_best,
            starting_value,
            status,
            deadline
        FROM goals
        ORDER BY
            CASE status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
            created_at DESC
    `);
}

async function getRecordExportData(): Promise<RecordExportRow[]> {
    const db = await getDatabase();
    if (!db) return [];

    return db.getAllAsync<RecordExportRow>(`
        SELECT
            exercise_name,
            reps,
            weight,
            value,
            achieved_at
        FROM personal_records
        WHERE is_current = 1 AND record_type = 'best_weight_for_reps'
        ORDER BY exercise_name ASC, reps ASC
    `);
}

// ============================================================
// Spreadsheet Generation
// ============================================================

/**
 * Generate a formatted .xlsx spreadsheet with 4 sheets and open
 * the native share sheet.
 *
 * @returns The file URI of the exported spreadsheet
 */
export async function generateSpreadsheetExport(): Promise<string> {
    const settings = await getSettings();
    const unit = settings?.weightUnit ?? 'lbs';
    const unitLabel = unit === 'kg' ? 'kg' : 'lbs';

    // Fetch all data in parallel
    const [workoutRows, measurementRows, goalRows, recordRows] = await Promise.all([
        getWorkoutExportData(),
        getMeasurementExportData(),
        getGoalExportData(),
        getRecordExportData(),
    ]);

    const wb = XLSX.utils.book_new();

    // --- Workouts sheet ---
    const workoutData = workoutRows.map((r) => ({
        'Date': r.completed_at ?? '',
        'Workout Name': r.workout_name,
        'Exercise': r.exercise_name,
        'Set #': r.set_number,
        'Set Type': r.set_type === 'warmup' ? 'W' : r.set_type,
        [`Weight (${unitLabel})`]: r.weight != null ? displayWeight(r.weight, unit) : '',
        'Reps': r.reps ?? '',
        'RPE': r.rpe ?? '',
        'Notes': r.note ?? '',
    }));
    const wsWorkouts = XLSX.utils.json_to_sheet(workoutData.length > 0 ? workoutData : [{}]);
    XLSX.utils.book_append_sheet(wb, wsWorkouts, 'Workouts');

    // --- Measurements sheet ---
    const measurementData = measurementRows.map((r) => ({
        'Date': r.recorded_at,
        'Metric': r.metric_name,
        'Value': r.value,
        'Unit': r.unit,
    }));
    const wsMeasurements = XLSX.utils.json_to_sheet(measurementData.length > 0 ? measurementData : [{}]);
    XLSX.utils.book_append_sheet(wb, wsMeasurements, 'Measurements');

    // --- Goals sheet ---
    const goalData = goalRows.map((r) => {
        const progress = (r.current_best != null && r.starting_value != null && r.target_value !== r.starting_value)
            ? Math.round(((r.current_best - r.starting_value) / (r.target_value - r.starting_value)) * 100)
            : '';
        return {
            'Goal': r.label ?? r.goal_type,
            'Type': r.goal_type,
            'Target': r.target_value,
            'Current': r.current_best ?? '',
            'Progress %': progress,
            'Status': r.status,
            'Deadline': r.deadline ?? '',
        };
    });
    const wsGoals = XLSX.utils.json_to_sheet(goalData.length > 0 ? goalData : [{}]);
    XLSX.utils.book_append_sheet(wb, wsGoals, 'Goals');

    // --- Personal Records sheet ---
    const recordData = recordRows.map((r) => ({
        'Exercise': r.exercise_name,
        'Reps': r.reps ?? '',
        [`Best Weight (${unitLabel})`]: r.weight != null ? displayWeight(r.weight, unit) : '',
        [`Est. 1RM (${unitLabel})`]: displayWeight(r.value, unit),
        'Date Achieved': r.achieved_at,
    }));
    const wsRecords = XLSX.utils.json_to_sheet(recordData.length > 0 ? recordData : [{}]);
    XLSX.utils.book_append_sheet(wb, wsRecords, 'Personal Records');

    // Write workbook to binary
    const wbOut = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Write to cache directory
    const dateStamp = formatISODate(new Date());
    const fileName = `workout-export-${dateStamp}.xlsx`;
    const file = new File(Paths.cache, fileName);

    // xlsx write produces base64, convert to Uint8Array for file write
    const binaryStr = atob(wbOut);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    file.write(bytes);

    // Open share sheet
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(file.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Workout Data',
    });

    return file.uri;
}
