import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Package, Minus, Plus, Download } from 'lucide-react';

export default function Financeiro({ pacientes }) {
  const [insumos, setInsumos] = useState({ kinesio: 0, agulhas: 0 });
  const handleInsumoChange = (item, delta) => setInsumos(p => ({ ...p, [item]: Math.max(0, p[item] + delta) }));
  const totalExtra = (insumos.kinesio * 25) + (insumos.agulhas * 4);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-bold mb-4">Receitas vs Perdas</h3>
          <div className="flex items-end h-32 space-x-8 border-b pb-2">
            <div className="flex-1 flex flex-col items-center"><div className="w-12 bg-green-500 rounded-t-lg h-32"></div><span className="text-[10px] mt-2 font-bold">R$ 8.5K</span></div>
            <div className="flex-1 flex flex-col items-center"><div className="w-12 bg-red-400 rounded-t-lg h-8"></div><span className="text-[10px] mt-2 font-bold text-red-500">R$ 1.2K</span></div>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h4 className="font-bold text-blue-800 flex items-center mb-4"><Package size={18} className="mr-2"/> Cobrança de Insumos</h4>
          <div className="space-y-3">
             <div className="flex justify-between bg-white p-3 rounded-lg shadow-sm">
                <span className="text-sm">Kinesio Tape</span>
                <div className="flex items-center space-x-3">
                  <button onClick={() => handleInsumoChange('kinesio', -1)} className="bg-gray-100 p-1 rounded"><Minus size={14}/></button>
                  <span className="font-bold">{insumos.kinesio}</span>
                  <button onClick={() => handleInsumoChange('kinesio', 1)} className="bg-blue-100 p-1 rounded text-blue-600"><Plus size={14}/></button>
                </div>
             </div>
          </div>
          <div className="mt-6 text-right font-bold text-blue-900">Total Extra: R$ {totalExtra.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}