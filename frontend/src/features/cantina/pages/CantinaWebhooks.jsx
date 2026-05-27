import { useEffect, useState } from 'react';
import api from '../../../services/api.js';
import Field from '../../../components/ui/Field.jsx';
import { extractError, formatDateTime } from '../../../utils/format.js';

const EVENTOS_DISPONIVEIS = [
  { id: 'COMPRA_REALIZADA', label: 'Compra realizada' },
  { id: 'RECARGA_REALIZADA', label: 'Recarga realizada (em breve)' },
];

export default function CantinaWebhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [err, setErr] = useState(null);
  const [novo, setNovo] = useState({ url: '', descricao: '', eventos: ['COMPRA_REALIZADA'] });
  const [criando, setCriando] = useState(false);
  const [secretRevelado, setSecretRevelado] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/webhooks');
      setWebhooks(data);
    } catch (e) {
      setErr(extractError(e));
    }
  };
  useEffect(() => { load(); }, []);

  const toggleEvento = (id) => {
    setNovo((s) => ({
      ...s,
      eventos: s.eventos.includes(id) ? s.eventos.filter((e) => e !== id) : [...s.eventos, id],
    }));
  };

  const criar = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!novo.url.trim()) { setErr('URL é obrigatória'); return; }
    if (!/^https?:\/\//.test(novo.url)) { setErr('URL deve começar com http:// ou https://'); return; }
    if (novo.eventos.length === 0) { setErr('Selecione ao menos 1 evento'); return; }
    setCriando(true);
    try {
      const { data } = await api.post('/webhooks', novo);
      setSecretRevelado({ id: data.id, secret: data.secret });
      setNovo({ url: '', descricao: '', eventos: ['COMPRA_REALIZADA'] });
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setCriando(false);
    }
  };

  const remover = async (id) => {
    if (!confirm('Remover este webhook? Os disparos pararão imediatamente.')) return;
    await api.delete(`/webhooks/${id}`);
    await load();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Webhooks · Integração ERP</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Receba notificações em tempo real no seu sistema cada vez que ocorrer um evento</p>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-sm font-medium">{err}</div>
      )}

      {secretRevelado && (
        <div className="card bg-amber-50/70 border border-amber-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-amber-900">Secret gerado — copie agora!</h3>
              <p className="text-xs text-amber-800 mt-1">Este código não será exibido novamente. Use-o no seu sistema para validar a assinatura <code className="bg-amber-100 px-1 rounded">X-Merenda-Signature</code> via HMAC-SHA256.</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="font-mono text-sm bg-white border border-amber-200 px-3 py-2 rounded-lg flex-1 select-all break-all">{secretRevelado.secret}</code>
                <button onClick={() => navigator.clipboard.writeText(secretRevelado.secret)}
                        className="btn-secondary text-xs">Copiar</button>
                <button onClick={() => setSecretRevelado(null)} className="text-xs text-amber-700 hover:text-amber-900">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={criar} noValidate className="card space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="feature-icon">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900">Novo webhook</h2>
            <p className="text-xs text-slate-500">Vamos fazer POST com Content-Type: application/json</p>
          </div>
        </div>

        <Field label="URL do endpoint" hint="Ex: https://erp.minhacantina.com/webhooks/merenda">
          <input className="input" type="url" placeholder="https://..."
                 value={novo.url} onChange={(e) => setNovo({ ...novo, url: e.target.value })} />
        </Field>

        <Field label="Descrição (opcional)">
          <input className="input" placeholder="Ex: Conciliação financeira diária"
                 value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
        </Field>

        <div>
          <div className="label">Eventos</div>
          <div className="flex flex-wrap gap-2">
            {EVENTOS_DISPONIVEIS.map((e) => {
              const ativo = novo.eventos.includes(e.id);
              return (
                <button key={e.id} type="button" onClick={() => toggleEvento(e.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                          ativo
                            ? 'bg-merenda-50 border-merenda-300 text-merenda-700 shadow-sm'
                            : 'bg-white/70 border-slate-200 text-slate-700 hover:border-merenda-300'
                        }`}>
                  {ativo ? '✓ ' : ''}{e.label}
                </button>
              );
            })}
          </div>
        </div>

        <button className="btn-primary" disabled={criando}>{criando ? 'Criando...' : 'Criar webhook'}</button>
      </form>

      <div className="card">
        <h2 className="font-display font-bold text-xl text-slate-900 mb-4">Webhooks cadastrados</h2>
        {webhooks.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">Nenhum webhook configurado ainda.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {webhooks.map((w) => (
              <li key={w.id} className="py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm text-slate-800 break-all">{w.url}</div>
                  {w.descricao && <div className="text-xs text-slate-500 mt-0.5">{w.descricao}</div>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {w.eventos.map((e) => (
                      <span key={e} className="badge bg-merenda-50 text-merenda-700 border border-merenda-100 normal-case tracking-normal">{e}</span>
                    ))}
                    {w.ativo
                      ? <span className="badge bg-green-50 text-green-700">Ativo</span>
                      : <span className="badge bg-slate-100 text-slate-600">Pausado</span>}
                  </div>
                  {w.ultimoDisparoEm && (
                    <div className="text-xs text-slate-400 mt-2">
                      Último disparo: {formatDateTime(w.ultimoDisparoEm)} · HTTP {w.ultimoStatusHttp}
                    </div>
                  )}
                </div>
                <button onClick={() => remover(w.id)} className="text-xs font-semibold text-red-600 hover:text-red-700 shrink-0">
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card bg-slate-900 text-slate-200">
        <h3 className="font-display font-bold text-white mb-2">Como validar a assinatura</h3>
        <p className="text-sm text-slate-300 mb-3">A cada disparo, enviamos o header <code className="bg-white/10 px-1 rounded">X-Merenda-Signature: sha256=&lt;hex&gt;</code>. Recalcule no seu lado e compare:</p>
        <pre className="bg-black/40 rounded-lg p-3 text-xs overflow-auto"><code>{`// Node.js exemplo
const crypto = require('crypto');
const esperado = crypto
  .createHmac('sha256', SECRET)
  .update(req.rawBody)
  .digest('hex');
const assinado = req.headers['x-merenda-signature'].split('=')[1];
const ok = crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(assinado));`}</code></pre>
      </div>
    </div>
  );
}
