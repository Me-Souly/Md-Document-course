import React, { createContext } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RootStore from '@stores/RootStore';
import { registerServiceWorker } from './sw-register';
import './index.css';

// Создаём единственный экземпляр RootStore
const rootStore = new RootStore();

// Типизируем контекст
interface StoreContextType {
    rootStore: RootStore;
}

// Создаём контекст
export const StoreContext = createContext<StoreContextType>({
    rootStore,
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <React.StrictMode>
        <StoreContext.Provider value={{ rootStore }}>
            <App />
        </StoreContext.Provider>
    </React.StrictMode>,
);

// Экспортируем для удобства использования в компонентах
export { rootStore };

// Регистрируем Service Worker для PWA (только в production)
registerServiceWorker();
