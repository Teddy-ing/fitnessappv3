import React from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import ImportBottomSheet from '../ImportBottomSheet';
import { parseFile, generateExerciseMappings, getUnresolvedMappings } from '../../../services/importParsers';

const mockNavigation = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));
jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    ActivityIndicator: 'ActivityIndicator', Modal: 'Modal',
    StyleSheet: { create: (styles: unknown) => styles }, Alert: { alert: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'MaterialIcons' }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('../../../services/importParsers', () => ({
    parseFile: jest.fn(), generateExerciseMappings: jest.fn(), getUnresolvedMappings: jest.fn(),
}));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
const parsed = {
    workouts: [], warnings: [],
    measurements: [{ date: '2026-10-01', type: 'bodyweight', value: 180, unit: 'lbs' }],
};
const findButton = (text: string) => {
    let node = renderer.root.findAllByType('Text').find((item: any) => item.children.join('') === text);
    if (!node) throw new Error(`Missing text: ${text}`);
    while (!node.props.onPress) node = node.parent;
    return node;
};
const renderSheet = async (onClose: () => void, onImportJSON = jest.fn()) => {
    await act(async () => { renderer = create(<ImportBottomSheet isOpen onClose={onClose} onImportJSON={onImportJSON} />); });
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
        canceled: false, assets: [{ uri: 'file:///import.csv', name: 'import.csv', mimeType: 'text/csv', lastModified: 0 }],
    });
    jest.mocked(parseFile).mockResolvedValue(parsed);
    jest.mocked(generateExerciseMappings).mockResolvedValue([]);
    jest.mocked(getUnresolvedMappings).mockReturnValue([]);
    const originalError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
        originalError(...args);
    });
});

afterEach(async () => {
    if (renderer) await act(async () => { renderer.unmount(); });
    renderer = undefined;
    jest.restoreAllMocks();
});

it('holds the sheet open for document picking and parsing, then closes and navigates once to the summary', async () => {
    const onClose = jest.fn();
    const onImportJSON = jest.fn();
    let chooseDocument!: (result: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>) => void;
    let finishParsing!: (result: Awaited<ReturnType<typeof parseFile>>) => void;
    jest.mocked(DocumentPicker.getDocumentAsync).mockReturnValue(new Promise(resolve => { chooseDocument = resolve; }));
    jest.mocked(parseFile).mockReturnValue(new Promise(resolve => { finishParsing = resolve; }));
    await renderSheet(onClose, onImportJSON);
    const back = renderer.root.findByType('Modal').props.onRequestClose;
    const backdrop = renderer.root.findAllByType('TouchableWithoutFeedback')[0].props.onPress;
    const json = findButton('This App (.json)').props.onPress;
    const startImport = findButton('Hevy').props.onPress;
    await act(async () => { startImport(); startImport(); back(); backdrop(); json(); });
    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(onImportJSON).not.toHaveBeenCalled();
    await act(async () => {
        chooseDocument({ canceled: false, assets: [{ uri: 'file:///import.csv', name: 'import.csv', lastModified: 0 }] });
    });
    expect(parseFile).toHaveBeenCalledWith('hevy', ['file:///import.csv']);
    await act(async () => { back(); backdrop(); });
    expect(onClose).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    await act(async () => { finishParsing(parsed); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ExerciseMapping', expect.objectContaining({
        source: 'hevy', measurements: parsed.measurements, skipToSummary: true,
    }));
});

it('allows dismissing after the document picker is canceled without parsing or navigating', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null });
    const onClose = jest.fn();
    await renderSheet(onClose);
    await act(async () => { findButton('Hevy').props.onPress(); });
    await act(async () => { renderer.root.findByType('Modal').props.onRequestClose(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(parseFile).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
});

it('allows dismissing after parsing fails and does not navigate', async () => {
    jest.mocked(parseFile).mockRejectedValue(new Error('Invalid CSV'));
    jest.mocked(console.error).mockImplementation(() => {});
    const onClose = jest.fn();
    await renderSheet(onClose);
    await act(async () => { findButton('Hevy').props.onPress(); });
    expect(Alert.alert).toHaveBeenCalledWith('Import Error', expect.any(String));
    await act(async () => { renderer.root.findAllByType('TouchableWithoutFeedback')[0].props.onPress(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
});
