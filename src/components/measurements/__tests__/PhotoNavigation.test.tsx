import React from 'react';
import PhotoViewer from '../PhotoViewer';
import CompareView from '../CompareView';
import type { ProgressPhoto } from '../../../models';

jest.mock('react-native', () => ({
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Image: 'Image', FlatList: 'FlatList', Modal: 'Modal',
    StyleSheet: { create: (styles: unknown) => styles }, Dimensions: { get: () => ({ width: 400 }) },
    Alert: { alert: jest.fn() },
}));
jest.mock('../../../services', () => ({ getPhotoUri: (path: string) => path }));
jest.mock('../../../hooks/useWeightUnit', () => ({ useWeightUnit: () => 'lbs' }));

const { create } = require('react-test-renderer');
const { act } = React;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: any;
const photo: ProgressPhoto = {
    id: 'photo-1', filePath: 'photo.jpg', recordedAt: '2026-10-01', bodyweight: null, note: null, createdAt: '2026-10-01',
};

beforeEach(() => {
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

it.each(['viewer', 'comparison'])('returns from the %s on Android Back without deleting a photo', async (mode) => {
    const onClose = jest.fn();
    const onDelete = jest.fn();
    await act(async () => {
        renderer = create(mode === 'viewer'
            ? <PhotoViewer visible photos={[photo]} initialIndex={0} onClose={onClose} onDelete={onDelete} />
            : <CompareView photos={[photo, { ...photo, id: 'photo-2' }]} onClose={onClose} />);
    });
    await act(async () => { renderer.root.findByType('Modal').props.onRequestClose(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
});
