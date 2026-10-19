import { createRoot } from 'react-dom/client';
import './styles.css';
declare global { interface Window { EXCALIDRAW_ASSET_PATH?: string | string[] } }
window.EXCALIDRAW_ASSET_PATH = new URL('./engine-assets/', window.location.href).href;
// The editor constructs font URLs at module evaluation, so configure its asset root before importing it.
void import('./editor/EditorHost').then(({ EditorHost }) => {
  createRoot(document.getElementById('root')!).render(<EditorHost />);
});
