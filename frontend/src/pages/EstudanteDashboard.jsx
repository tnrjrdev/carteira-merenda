import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api.js';
import { brl, extractError, formatDateTime } from '../utils/format.js';

export default function EstudanteDashboard() {
  const [saldo, setSaldo] = useState(null);
  const [extrato, setExtrato] = useState([]);
  const [token, setToken] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [err, setErr] = useState(null);
  const [cantinas, setCantinas] = useState([]);
  const [cantinaSelecionada, setCantinaSelecionada] = useState(null);
  const [produtos, setProdutos] = useState([]);

  const load = async () => {
    try {
      const [s, e, c] = await Promise.all([
        api.get('/carteira/me'),
        api.get('/carteira/me/extrato'),
        api.get('/cantinas'),
      ]);
      setSaldo(s.data);
      setExtrato(e.data);
      setCantinas(c.data);
      if (c.data.length > 0 && !cantinaSelecionada) {
        setCantinaSelecionada(c.data[0].id);
      }
    } catch (e) {
      setErr(extractError(e));
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!cantinaSelecionada) return;
    api.get(`/produtos/cantina/${cantinaSelecionada}`)
      .then(({ data }) => setProdutos(data))
      .catch(() => setProdutos([]));
  }, [cantinaSelecionada]);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(token.expiraEm) - new Date()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) {
        setToken(null);
        clearInterval(id);
        load();
      }
    }, 500);
    return () => clearInterval(id);
  }, [token]);

  const gerarToken = async () => {
    try {
      const { data } = await api.post('/pagamentos/token');
      setToken(data);
      setSecondsLeft(Math.floor((new Date(data.expiraEm) - new Date()) / 1000));
    } catch (e) {
      setErr(extractError(e));
    }
  };

  if (!saldo) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin h-8 w-8 border-4 border-merenda-500 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="glass-panel overflow-hidden relative bg-gradient-to-br from-merenda-500 to-merenda-700 text-white shadow-glow border-0">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-black/10 rounded-full blur-xl"></div>
        
        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl backdrop-blur-md border border-white/30">
              👋
            </div>
            <div className="text-lg font-medium opacity-90 font-display">Olá, {saldo.nomeEstudante}!</div>
          </div>
          
          <div className="mt-6">
            <div className="text-sm font-medium opacity-80 uppercase tracking-wider">Saldo disponível</div>
            <div className="text-5xl md:text-6xl font-display font-bold mt-1 tracking-tight">{brl(saldo.saldo)}</div>
          </div>
          
          {saldo.limiteDiario && (
            <div className="mt-6 bg-black/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="opacity-90">Gasto hoje</span>
                <span className="font-semibold">{brl(saldo.gastoHoje)} <span className="opacity-70 font-normal">/ {brl(saldo.limiteDiario)}</span></span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full ${saldo.gastoHoje >= saldo.limiteDiario ? 'bg-red-400' : 'bg-white'}`}
                  style={{ width: `${Math.min(100, (saldo.gastoHoje / saldo.limiteDiario) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm animate-slide-up">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {err}
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-5 space-y-6">
          <div className="card text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-merenda-50 to-white opacity-50 z-0"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-display font-bold text-slate-800 mb-2">Pagar na cantina</h2>
              <p className="text-sm text-slate-500 mb-6">Gere um QR Code e mostre ao operador.</p>
              
              {!token ? (
                <button className="btn-primary w-full py-4 text-lg shadow-glow group-hover:scale-[1.02] transition-transform" onClick={gerarToken}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Gerar QR Code
                </button>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="inline-block p-5 bg-white border-4 border-merenda-100 shadow-glass rounded-3xl transition-all">
                    <QRCodeSVG value={token.token} size={200} className="mx-auto" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Código de pagamento</div>
                    <div className="font-mono text-2xl font-bold tracking-widest text-slate-800 bg-slate-100/80 px-4 py-3 rounded-xl inline-block border border-slate-200">
                      {token.token}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold flex items-center justify-center gap-2 ${secondsLeft < 20 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Expira em {secondsLeft}s
                  </div>
                  <button className="btn-secondary w-full" onClick={() => setToken(null)}>Cancelar</button>
                </div>
              )}
            </div>
          </div>

          {cantinas.length > 0 && (
            <div className="card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-display font-bold text-slate-800">Cardápio</h2>
                <select className="input py-2 text-sm max-w-xs bg-slate-50" value={cantinaSelecionada || ''} onChange={(e) => setCantinaSelecionada(Number(e.target.value))}>
                  {cantinas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              
              {produtos.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <svg className="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>Nenhum produto disponível nesta cantina.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {produtos.map((p) => (
                    <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 hover:shadow-sm transition-shadow hover:border-merenda-200">
                      <div className="font-semibold text-slate-800 line-clamp-2 leading-tight mb-1">{p.nome}</div>
                      {p.categoriaNome && (
                        <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">{p.categoriaNome}</div>
                      )}
                      <div className="text-merenda-600 font-bold text-lg">{brl(p.preco)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="md:col-span-7">
          <div className="card h-full">
            <h2 className="text-xl font-display font-bold text-slate-800 mb-5 border-b border-slate-100 pb-4">Últimas movimentações</h2>
            
            {extrato.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p>Nenhuma transação ainda.</p>
                <p className="text-xs mt-1 text-slate-400">Seus gastos aparecerão aqui.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {extrato.map((t) => (
                  <li key={t.id} className="py-4 flex items-center justify-between hover:bg-slate-50/50 px-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm border
                        ${t.tipo === 'COMPRA' ? 'bg-red-50 text-red-500 border-red-100' : 
                          t.tipo === 'RECARGA' ? 'bg-green-50 text-green-500 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                      >
                        {t.tipo === 'COMPRA' ? '🍔' : t.tipo === 'RECARGA' ? '💰' : '📄'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-base">
                          {t.tipo === 'COMPRA' ? 'Compra na Cantina' : t.tipo === 'RECARGA' ? 'Recarga de Saldo' : t.tipo}
                        </div>
                        {t.cantinaNome && <div className="text-sm font-medium text-slate-500 mt-0.5">{t.cantinaNome}</div>}
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDateTime(t.criadaEm)}
                        </div>
                      </div>
                    </div>
                    <div className={`font-display font-bold text-lg px-3 py-1 rounded-lg ${t.tipo === 'COMPRA' ? 'text-slate-800' : 'text-green-600 bg-green-50'}`}>
                      {t.tipo === 'COMPRA' ? '-' : '+'}{brl(t.valor)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
