import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import Field from '../components/Field.jsx';
import { brl, extractError, formatDateTime } from '../utils/format.js';

export default function EstudanteConquistas() {
  const [resumo, setResumo] = useState(null);
  const [novaMeta, setNovaMeta] = useState({ titulo: '', valorAlvo: '', prazo: '' });
  const [aporte, setAporte] = useState({});
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/gamificacao/me');
      setResumo(data);
    } catch (e) { setErr(extractError(e)); }
  };

  useEffect(() => { load(); }, []);

  const criar = async (e) => {
    e.preventDefault();
    if (!novaMeta.titulo || !novaMeta.valorAlvo) return;
    try {
      await api.post('/gamificacao/metas', {
        titulo: novaMeta.titulo,
        valorAlvo: Number(novaMeta.valorAlvo),
        prazo: novaMeta.prazo || null,
      });
      setNovaMeta({ titulo: '', valorAlvo: '', prazo: '' });
      await load();
    } catch (e) { setErr(extractError(e)); }
  };

  const progredir = async (id) => {
    const valor = Number(aporte[id]);
    if (!valor) return;
    try {
      await api.post(`/gamificacao/metas/${id}/progresso`, { incremento: valor });
      setAporte({ ...aporte, [id]: '' });
      await load();
    } catch (e) { setErr(extractError(e)); }
  };

  if (!resumo) return <div className="text-slate-500">Carregando…</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Conquistas e metas</h1>
          <p className="text-sm text-slate-500 mt-1">Olá, {resumo.nome}! Você tem <b className="text-merenda-600">{resumo.pontos} pontos</b>.</p>
        </div>
        <Link to="/estudante" className="btn-secondary text-sm">← Voltar à carteira</Link>
      </header>

      {err && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{err}</div>}

      <section className="card">
        <h2 className="font-display font-bold text-xl text-slate-900 mb-4">🏅 Minhas conquistas</h2>
        {(!resumo.badges || resumo.badges.length === 0) ? (
          <p className="text-sm text-slate-500">Faça compras saudáveis e cumpra metas para desbloquear conquistas!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {resumo.badges.map((ub) => (
              <div key={ub.id} className="text-center bg-gradient-to-br from-merenda-50 to-amber-50 border border-merenda-200 rounded-xl p-4">
                <div className="text-4xl mb-2">{ub.badge.emoji || '🏆'}</div>
                <div className="font-semibold text-slate-800 text-sm">{ub.badge.nome}</div>
                <div className="text-[10px] text-slate-500 mt-1">{ub.badge.pontos} pts</div>
                <div className="text-[10px] text-slate-400 mt-1">{formatDateTime(ub.ganhoEm)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="font-display font-bold text-xl text-slate-900 mb-4">🎯 Minhas metas de poupança</h2>

        <form onSubmit={criar} className="grid sm:grid-cols-4 gap-3 mb-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="sm:col-span-2">
            <Field label="Título">
              <input className="input" placeholder="Comprar tênis novo" value={novaMeta.titulo}
                     onChange={(e) => setNovaMeta({ ...novaMeta, titulo: e.target.value })} />
            </Field>
          </div>
          <Field label="Valor alvo (R$)">
            <input className="input" type="number" min="1" step="0.01" value={novaMeta.valorAlvo}
                   onChange={(e) => setNovaMeta({ ...novaMeta, valorAlvo: e.target.value })} />
          </Field>
          <Field label="Prazo (opcional)">
            <input className="input" type="date" value={novaMeta.prazo}
                   onChange={(e) => setNovaMeta({ ...novaMeta, prazo: e.target.value })} />
          </Field>
          <div className="sm:col-span-4">
            <button className="btn-primary">Nova meta</button>
          </div>
        </form>

        {(!resumo.metas || resumo.metas.length === 0) ? (
          <p className="text-sm text-slate-500">Defina uma meta para começar.</p>
        ) : (
          <ul className="space-y-3">
            {resumo.metas.map((m) => {
              const atual = Number(m.valorAtual || 0);
              const alvo = Number(m.valorAlvo);
              const pct = alvo > 0 ? Math.min(100, (atual / alvo) * 100) : 0;
              return (
                <li key={m.id} className={`border rounded-xl p-4 ${m.concluida ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800">{m.titulo} {m.concluida && '✅'}</div>
                      {m.prazo && <div className="text-xs text-slate-500">Prazo: {m.prazo}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">{brl(atual)} / {brl(alvo)}</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                    <div className={`h-2 rounded-full ${m.concluida ? 'bg-green-500' : 'bg-merenda-500'}`}
                         style={{ width: `${pct}%` }}></div>
                  </div>
                  {!m.concluida && (
                    <div className="flex gap-2 mt-3">
                      <input className="input flex-1" type="number" step="0.01" placeholder="R$ a guardar"
                             value={aporte[m.id] || ''}
                             onChange={(e) => setAporte({ ...aporte, [m.id]: e.target.value })} />
                      <button onClick={() => progredir(m.id)} className="btn-primary text-sm">+ Guardar</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
