import { createContext, useContext } from 'react';

export const StartupContext = createContext({
    isComplete: true,
    onInitializationComplete: () => {},
});

export function useStartup() {
    return useContext(StartupContext);
}
