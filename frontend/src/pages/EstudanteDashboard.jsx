import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api.js';
import { brl, extractError, formatDateTime } from '../utils/format.js';
import { nfcSupported, escreverNfc } from '../services/nfc.js';

const HeaderSaldo = ({ saldo }) => (
  <header className="glass-panel overflow-hidden relative bg-gradient-to-br from-merenda-500 to-merenda-700 text-white shadow-glow border-0">
    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
    <div className="relative z-10 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl backdrop-blur-md border border-white/30">👋</div>
        <h1 className="text-lg font-medium opacity-90">Olá, {saldo.nomeEstudante}!</h1>
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
            <div className={`h-2 rounded-full ${saldo.gastoHoje >= saldo.limiteDiario ? 'bg-red-400' : 'bg-white'}`}
                 style={{ width: `${Math.min(100, (saldo.gastoHoje / saldo.limiteDiario) * 100)}%` }}></div>
          </div>
        </div>
      )}
    </div>
  </header>
);

export default function EstudanteDashboard() {
  const [saldo, setSaldo] = useState(null);
  const [extrato, setExtrato] = useState([]);
  const [token, setToken] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [err, setErr] = useState(null);
  const [escrevendoNfc, setEscrevendoNfc] = useState(false);
  const [avisoNfc, setAvisoNfc] = useState(null);

  const podeNfc = nfcSupported();

  const load = async () => {
    try {
      const [s, e] = await Promise.all([
        api.get('/carteira/me'),
        api.get('/carteira/me/extrato'),
      ]);
      setSaldo(s.data);
      setExtrato(e.data);
    } catch (e) { setErr(extractError(e)); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(token.expiraEm) - new Date()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) { setToken(null); clearInterval(id); load(); }
    }, 500);
    return () => clearInterval(id);
  }, [token]);

  const gerarQr = async () => {
    try {
      setErr(null); setAvisoNfc(null);
      const { data } = await api.post('/pagamentos/token');
      setToken({ ...data, canal: 'QR' });
      setSecondsLeft(Math.floor((new Date(data.expiraEm) - new Date()) / 1000));
    } catch (e) { setErr(extractError(e)); }
  };

  const gerarNfc = async () => {
    if (!podeNfc) { setErr('Seu navegador não suporta NFC (apenas Android + Chrome)'); return; }
    try {
      setErr(null); setAvisoNfc('Aproxime o cartão/pulseira NFC do celular…');
      const { data } = await api.post('/pagamentos/token-nfc');
      setToken({ ...data, canal: 'NFC' });
      setEscrevendoNfc(true);
      await escreverNfc(data.token);
      setAvisoNfc('✓ Cartão gravado! Encoste ele no PDV em até ' +
          Math.floor((new Date(data.expiraEm) - new Date()) / 1000) + 's.');
    } catch (e) {
      setErr(e?.message || 'Falha NFC');
    } finally { setEscrevendoNfc(false); }
  };

  if (!saldo) return <div className="text-slate-500">Carregando…</div>;

  return (
    <main className="space-y-6 animate-fade-in pb-10 max-w-7xl mx-auto">
      <HeaderSaldo saldo={saldo} />

      {err && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{err}</div>}
      {avisoNfc && <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-xl text-sm">{avisoNfc}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/estudante/pedidos" className="card hover:shadow-glass-hover transition-all text-center p-4">
          <div className="text-3xl mb-1">🍱</div>
          <div className="font-semibold text-sm">Pedidos antecipados</div>
        </Link>
        <Link to="/estudante/conquistas" className="card hover:shadow-glass-hover transition-all text-center p-4">
          <div className="text-3xl mb-1">🏅</div>
          <div className="font-semibold text-sm">Conquistas e metas</div>
        </Link>
        <Link to="/conta" className="card hover:shadow-glass-hover transition-all text-center p-4">
          <div className="text-3xl mb-1">👤</div>
          <div className="font-semibold text-sm">Minha conta</div>
        </Link>
        <Link to="/politica-privacidade" target="_blank" className="card hover:shadow-glass-hover transition-all text-center p-4">
          <div className="text-3xl mb-1">🔒</div>
          <div className="font-semibold text-sm">Privacidade</div>
        </Link>
      </div>

      <section className="card text-center relative overflow-hidden">
        <h2 className="text-xl font-display font-bold text-slate-800 mb-2">Pagar na cantina</h2>
        <p className="text-sm text-slate-500 mb-6">QR Code (90s) ou NFC (30s) — escolha o canal</p>

        {!token ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <button onClick={gerarQr} className="btn-primary py-4 text-lg">📱 Gerar QR Code</button>
            <button onClick={gerarNfc} disabled={!podeNfc || escrevendoNfc} className="btn-secondary py-4 text-lg disabled:opacity-50">
              {escrevendoNfc ? 'Gravando…' : '📶 Pagar com NFC'}
            </button>
            {!podeNfc && <p className="sm:col-span-2 text-xs text-slate-400">NFC requer Android + Chrome + HTTPS.</p>}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {token.canal === 'QR' ? (
              <div className="inline-block p-5 bg-white border-4 border-merenda-100 rounded-3xl">
                <QRCodeSVG value={token.token} size={200} className="mx-auto" />
              </div>
            ) : (
              <div className="inline-block p-8 bg-blue-50 border-4 border-blue-200 rounded-3xl">
                <div className="text-7xl">📶</div>
                <div className="font-mono text-sm text-slate-700 mt-3 break-all">{token.token.slice(0, 16)}…</div>
                <div className="text-xs text-blue-700 mt-2">Cartão NFC pronto · encoste no PDV</div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Código</div>
              <div className="font-mono text-lg font-bold tracking-widest text-slate-800 bg-slate-100/80 px-4 py-3 rounded-xl inline-block border border-slate-200">
                {token.token}
              </div>
            </div>
            <div className={`text-sm font-semibold ${secondsLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>
              ⏱ Expira em {secondsLeft}s
            </div>
            <button className="btn-secondary w-full" onClick={() => setToken(null)}>Cancelar</button>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="text-xl font-display font-bold text-slate-800 mb-5 border-b border-slate-100 pb-4">Últimas movimentações</h2>
        {extrato.length === 0 ? (
          <p className="text-center py-8 text-slate-500 text-sm">Nenhuma transação ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {extrato.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    t.tipo === 'COMPRA' ? 'bg-red-50' : t.tipo === 'RECARGA' || t.tipo === 'MESADA' ? 'bg-green-50' : 'bg-slate-50'
                  }`}>
                    {t.tipo === 'COMPRA' ? '🍔' : t.tipo === 'MESADA' ? '💸' : t.tipo === 'RECARGA' ? '💰' : t.tipo === 'ESTORNO' ? '↩' : '📄'}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">
                      {t.tipo === 'COMPRA' ? 'Compra' : t.tipo === 'RECARGA' ? 'Recarga' : t.tipo}
                    </div>
                    <div className="text-xs text-slate-400">{formatDateTime(t.criadaEm)}</div>
                  </div>
                </div>
                <div className={`font-display font-bold ${
                  t.tipo === 'COMPRA' || t.tipo === 'TAXA_PLATAFORMA' ? 'text-slate-800' : 'text-green-600'
                }`}>
                  {(t.tipo === 'COMPRA' || t.tipo === 'TAXA_PLATAFORMA') ? '−' : '+'}{brl(t.valor)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
