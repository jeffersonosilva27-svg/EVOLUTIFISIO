import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const container = document.getElementById('root');
const root = createRoot(container);

// Renderização protegida
try {
  root.render(<App />);
} catch (error) {
  console.error("Erro Crítico de Renderização:", error);
  container.innerHTML = `<div style="padding:20px;text-align:center;"><h1>Erro ao carregar EVOLUTI FISIO</h1><button onclick="location.reload()">Recarregar Sistema</button></div>`;
}