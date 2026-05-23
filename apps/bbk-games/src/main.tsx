import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';
import App from './App.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('缺少 React 根节点');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW());
}
