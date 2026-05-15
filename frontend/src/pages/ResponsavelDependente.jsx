import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api.js';
import Field from '../components/Field.jsx';
import { brl, extractError, formatDateTime } from '../utils/format.js';
import * as V from '../utils/validation.js';

export default function ResponsavelDependente() {
  const { id } = useParams();
  const [saldo, setSaldo] = useState(null);
  const [extrato, setExtrato] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [err, setErr] = useState(null);
  const [recarga, setRecarga] = useState('');
  const [recargaErr, setRecargaErr] = useState(null);
  const [recargaOk, setRecargaOk] = useState(null);
  const [limites, setLimites] = useState({ limiteDiario: '', limiteSemanal: '' });

  const load = async () => {
    try {
      const [s, e, b, c] = await Promise.all([
        api.get(`/carteira/estudante/${id}`),
        api.get(`/carteira/estudante/${id}/extrato`),
        api.get(`/bloqueios/estudante/${id}`),
        api.get('/categorias'),
      ]);
      setSaldo(s.data);
      setExtrato(e.data);
      setBloqueios(b.data);
      setCategorias(c.data);
      setLimites({
        limiteDiario: s.data.limiteDiario ?? '',
        limiteSemanal: s.data.limiteSemanal ?? '',
      });
    } catch (e) {
      setErr(extractError(e));
    }
  };

  useEffect(() => { load(); }, [id]);

  const recarregar = async (e) => {
    e.preventDefault();
    setRecargaErr(null);
    setRecargaOk(null);
    const valor = Number(recarga);
    if (!recarga || isNaN(valor)) {
      setRecargaErr('Informe um valor válido');
      return;
    }
    if (valor < 1) {
      setRecargaErr('Valor mínimo de recarga é R$ 1,00');
      return;
    }
    if (valor > 10000) {
      setRecargaErr('Valor máximo de recarga é R$ 10.000,00');
      return;
    }
    try {
      await api.post('/carteira/recarga', {
        estudanteId: Number(id),
        valor,
        metodo: 'Pix',
      });
      setRecarga('');
      setRecargaOk(`Recarga de ${brl(valor)} realizada com sucesso!`);
      await load();
    } catch (e) {
      setRecargaErr(extractError(e));
    }
  };

  const salvarLimites = async (e) => {
    e.preventDefault();
    setErr(null);
    if (limites.limiteDiario !== '' && Number(limites.limiteDiario) < 0) {
      setErr('Limite diário não pode ser negativo');
      return;
    }
    if (limites.limiteSemanal !== '' && Number(limites.limiteSemanal) < 0) {
      setErr('Limite semanal não pode ser negativo');
      return;
    }
    if (limites.limiteDiario !== '' && limites.limiteSemanal !== ''
        && Number(limites.limiteDiario) > Number(limites.limiteSemanal)) {
      setErr('Limite diário não pode ser maior que o semanal');
      return;
    }
    try {
      await api.put(`/dependentes/${id}/limites`, {
        limiteDiario: limites.limiteDiario === '' ? null : Number(limites.limiteDiario),
        limiteSemanal: limites.limiteSemanal === '' ? null : Number(limites.limiteSemanal),
      });
      await load();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const toggleBloqueio = async (categoriaId, ativo) => {
    try {
      if (ativo) {
        await api.delete(`/bloqueios/estudante/${id}/categoria/${categoriaId}`);
      } else {
        await api.post(`/bloqueios/estudante/${id}/categoria/${categoriaId}`, { motivo: 'Bloqueado pelos responsáveis' });
      }
      await load();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const isBloqueada = (catId) => bloqueios.some((b) => b.categoriaId === catId);

  if (!saldo) {
    return <div className="text-slate-500">Carregando...</div>;
  }

  return (
    <div className="space-y-5">
      <Link to="/responsavel" className="text-sm text-merenda-600">&larr; Voltar</Link>

      <div className="card bg-gradient-to-br from-merenda-500 to-merenda-600 text-white">
        <div className="text-sm opacity-90">Saldo de {saldo.nomeEstudante}</div>
        <div className="text-4xl font-bold mt-1">{brl(saldo.saldo)}</div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="opacity-80">Gasto hoje</div>
            <div className="font-semibold">{brl(saldo.gastoHoje)}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="opacity-80">Gasto semana</div>
            <div className="font-semibold">{brl(saldo.gastoSemana)}</div>
          </div>
        </div>
      </div>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{err}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <form onSubmit={recarregar} className="card space-y-3">
          <h2 className="font-semibold">Recarregar carteira</h2>
          {recargaErr && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{recargaErr}</div>}
          {recargaOk && <div className="bg-green-50 text-green-700 p-2 rounded text-sm">{recargaOk}</div>}
          <div>
            <label className="label">Valor (R$)</label>
            <input className="input" type="number" step="0.01" min="0.01" required
                   value={recarga} onChange={(e) => setRecarga(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {[10, 20, 50, 100].map((v) => (
              <button key={v} type="button" onClick={() => setRecarga(String(v))} className="btn-secondary text-sm flex-1">
                R$ {v}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full">Recarregar via Pix</button>
        </form>

        <form onSubmit={salvarLimites} className="card space-y-3">
          <h2 className="font-semibold">Limites de gastos</h2>
          <div>
            <label className="label">Limite diário (R$)</label>
            <input className="input" type="number" step="0.01" placeholder="Sem limite"
                   value={limites.limiteDiario} onChange={(e) => setLimites({ ...limites, limiteDiario: e.target.value })} />
          </div>
          <div>
            <label className="label">Limite semanal (R$)</label>
            <input className="input" type="number" step="0.01" placeholder="Sem limite"
                   value={limites.limiteSemanal} onChange={(e) => setLimites({ ...limites, limiteSemanal: e.target.value })} />
          </div>
          <button className="btn-primary w-full">Salvar limites</button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Bloqueio nutricional</h2>
        <p className="text-xs text-slate-500 mb-3">Bloqueie categorias que não devem ser consumidas (ex: alergias, restrições).</p>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => {
            const ativo = isBloqueada(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleBloqueio(c.id, ativo)}
                className={`px-3 py-1.5 rounded-full text-sm border ${ativo ? 'bg-red-50 border-red-300 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              >
                {ativo ? '🚫 ' : ''}{c.nome}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Extrato</h2>
        {extrato.length === 0 && <p className="text-sm text-slate-500">Nenhuma transação ainda.</p>}
        <ul className="divide-y divide-slate-100">
          {extrato.map((t) => (
            <li key={t.id} className="py-3 flex items-start justify-between">
              <div>
                <div className="font-medium text-slate-800">
                  {t.tipo === 'COMPRA' ? '🍔 Compra' : t.tipo === 'RECARGA' ? '💰 Recarga' : t.tipo}
                  {t.cantinaNome && <span className="text-slate-500 font-normal"> · {t.cantinaNome}</span>}
                </div>
                <div className="text-xs text-slate-500">{formatDateTime(t.criadaEm)}</div>
                {t.itens?.length > 0 && (
                  <ul className="text-xs text-slate-600 mt-1">
                    {t.itens.map((i, idx) => (
                      <li key={idx}>{i.quantidade}× {i.nomeProduto} ({brl(i.subtotal)})</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={`font-bold ${t.tipo === 'COMPRA' ? 'text-red-600' : 'text-green-600'}`}>
                {t.tipo === 'COMPRA' ? '-' : '+'}{brl(t.valor)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
