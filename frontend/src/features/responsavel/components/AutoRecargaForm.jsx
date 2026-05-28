import { useEffect, useState } from 'react';
import api from '../../../services/api.js';
import Field from '../../../components/ui/Field.jsx';
import { brl, extractError, formatDateTime } from '../../../utils/format.js';
import SalvarCartaoBrick from './SalvarCartaoBrick.jsx';

/**
 * Auto-recarga: quando o saldo do estudante cai abaixo do mínimo definido,
 * o backend cobra automaticamente o cartão salvo do responsável.
 */
export default function AutoRecargaForm({ estudanteId }) {
  const [cfg, setCfg] = useState(null);
  const [saldoMin, setSaldoMin] = useState('');
  const [valor, setValor] = useState('');
  const [ativa, setAtiva] = useState(false);
  const [vincular, setVincular] = useState(false);
  const [err, setErr] = useState(null);
  const [aviso, setAviso] = useState(null);

  const carregar = async () => {
    try {
      const { data } = await api.get(`/carteira/auto-recarga/estudante/${estudanteId}`);
      setCfg(data);
      setSaldoMin(data.saldoMinimo || '');
      setValor(data.valorRecarga || '');
      setAtiva(!!data.ativa);
    } catch (e) { setErr(extractError(e)); }
  };

  useEffect(() => { carregar(); }, [estudanteId]);

  const salvar = async (e) => {
    e?.preventDefault();
    setErr(null); setAviso(null);
    try {
      const { data } = await api.put(`/carteira/auto-recarga/estudante/${estudanteId}`, {
        ativa,
        saldoMinimo: saldoMin === '' ? null : Number(saldoMin),
        valorRecarga: valor === '' ? null : Number(valor),
      });
      setCfg(data);
      setAviso(ativa ? 'Auto-recarga ativada!' : 'Auto-recarga pausada.');
    } catch (e) { setErr(extractError(e)); }
  };

  const tokenSalvar = async ({ cardToken }) => {
    setErr(null); setAviso(null);
    try {
      const { data } = await api.put(`/carteira/auto-recarga/estudante/${estudanteId}`, {
        ativa: true,
        saldoMinimo: Number(saldoMin || 10),
        valorRecarga: Number(valor || 20),
        cardToken,
      });
      setCfg(data);
      setAviso('Cartão salvo! Auto-recarga ativa.');
      setAtiva(true);
      setVincular(false);
    } catch (e) { setErr(extractError(e)); throw e; }
  };

  const removerCartao = async () => {
    if (!confirm('Remover cartão? Auto-recarga será pausada.')) return;
    try {
      const { data } = await api.delete(`/carteira/auto-recarga/estudante/${estudanteId}/cartao`);
      setCfg(data);
      setAtiva(false);
      setAviso('Cartão removido.');
    } catch (e) { setErr(extractError(e)); }
  };

  if (!cfg) return <div className="text-xs text-slate-500">Carregando…</div>;

  return (
    <form onSubmit={salvar} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Recarregar quando saldo < (R$)">
          <input className="input" type="number" min="1" step="0.01"
                 value={saldoMin} onChange={(e) => setSaldoMin(e.target.value)} placeholder="ex: 10" />
        </Field>
        <Field label="Valor da recarga automática (R$)">
          <input className="input" type="number" min="1" step="0.01"
                 value={valor} onChange={(e) => setValor(e.target.value)} placeholder="ex: 20" />
        </Field>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)}
               disabled={!cfg.temCartao} />
        Auto-recarga ativa{!cfg.temCartao && <span className="text-xs text-slate-500"> (vincule um cartão primeiro)</span>}
      </label>

      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
        {cfg.temCartao ? (
          <div className="flex items-center gap-2 text-sm">
            <span>💳 <b>{cfg.cardBandeira}</b> •••• <b>{cfg.cardUltimos4}</b></span>
            <button type="button" onClick={removerCartao} className="text-xs text-red-600 hover:underline ml-auto">
              Remover cartão
            </button>
          </div>
        ) : !vincular ? (
          <button type="button" onClick={() => setVincular(true)} className="btn-secondary text-sm">
            💳 Vincular cartão para auto-recarga
          </button>
        ) : (
          <SalvarCartaoBrick onTokenObtido={tokenSalvar} onErro={(msg) => setErr(msg)} />
        )}
      </div>

      {cfg.ultimaAutoRecargaEm && (
        <p className="text-xs text-slate-500">Última auto-recarga: {formatDateTime(cfg.ultimaAutoRecargaEm)}</p>
      )}
      {cfg.ultimaFalha && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-xs">
          ⚠ Última falha: {cfg.ultimaFalha} ({cfg.ultimaFalhaEm && formatDateTime(cfg.ultimaFalhaEm)})
        </div>
      )}

      {err && <div className="bg-red-50 border border-red-200 text-red-600 p-2 rounded-lg text-xs">{err}</div>}
      {aviso && <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded-lg text-xs">{aviso}</div>}

      <button className="btn-primary text-sm" type="submit" disabled={!cfg.temCartao}>
        Salvar configuração
      </button>
      <p className="text-[10px] text-slate-400">
        A cobrança é tentada após cada compra, com limite de 1 tentativa por hora. Falhas notificam você.
      </p>
    </form>
  );
}
