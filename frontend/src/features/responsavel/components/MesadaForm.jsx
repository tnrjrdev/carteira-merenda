import { useEffect, useState } from 'react';
import api from '../../../services/api.js';
import Field from '../../../components/ui/Field.jsx';
import { brl, extractError } from '../../../utils/format.js';
import SalvarCartaoBrick from './SalvarCartaoBrick.jsx';

const FREQUENCIAS = [
  { v: 'DIARIA', l: 'Toda escola dia (segunda a sexta)' },
  { v: 'SEMANAL', l: 'Semanal' },
  { v: 'QUINZENAL', l: 'Quinzenal' },
  { v: 'MENSAL', l: 'Mensal' },
];
const DIAS_SEMANA = [
  { v: 'MONDAY', l: 'Segunda' }, { v: 'TUESDAY', l: 'Terça' },
  { v: 'WEDNESDAY', l: 'Quarta' }, { v: 'THURSDAY', l: 'Quinta' },
  { v: 'FRIDAY', l: 'Sexta' }, { v: 'SATURDAY', l: 'Sábado' }, { v: 'SUNDAY', l: 'Domingo' },
];

export default function MesadaForm({ estudanteId }) {
  const [m, setM] = useState({ valor: '', frequencia: 'SEMANAL', diaSemana: 'MONDAY', diaMes: 5, ativa: true });
  const [carregado, setCarregado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [err, setErr] = useState(null);
  const [vincularCartao, setVincularCartao] = useState(false);

  const recarregar = () =>
    api.get(`/mesadas/estudante/${estudanteId}`).then(({ data }) => {
      if (data && data.id) {
        setM({
          valor: data.valor,
          frequencia: data.frequencia,
          diaSemana: data.diaSemana || 'MONDAY',
          diaMes: data.diaMes || 5,
          ativa: data.ativa,
          ultimaExecucao: data.ultimaExecucao,
          cobrarDoCartao: data.cobrarDoCartao,
          cardBandeira: data.cardBandeira,
          cardUltimos4: data.cardUltimos4,
          ultimaFalhaCobranca: data.ultimaFalhaCobranca,
        });
      }
    });

  useEffect(() => { recarregar().catch(() => {}).finally(() => setCarregado(true)); }, [estudanteId]);

  const salvar = async (e) => {
    e.preventDefault();
    setErr(null); setAviso(null);
    if (!m.valor || Number(m.valor) <= 0) { setErr('Valor inválido'); return; }
    try {
      await api.put(`/mesadas/estudante/${estudanteId}`, {
        valor: Number(m.valor),
        frequencia: m.frequencia,
        diaSemana: ['SEMANAL', 'QUINZENAL'].includes(m.frequencia) ? m.diaSemana : null,
        diaMes: m.frequencia === 'MENSAL' ? Number(m.diaMes) : null,
        ativa: !!m.ativa,
      });
      setAviso('Mesada salva! Próximo crédito segue o cronograma.');
      await recarregar();
    } catch (e) { setErr(extractError(e)); }
  };

  const desativar = async () => {
    try {
      await api.delete(`/mesadas/estudante/${estudanteId}`);
      setM({ valor: '', frequencia: 'SEMANAL', diaSemana: 'MONDAY', diaMes: 5, ativa: false });
      setAviso('Mesada removida.');
    } catch (e) { setErr(extractError(e)); }
  };

  const tokenSalvar = async ({ cardToken }) => {
    setErr(null); setAviso(null);
    try {
      await api.post(`/mesadas/estudante/${estudanteId}/cartao`, { cardToken });
      setAviso('Cartão vinculado! Agora a mesada será cobrada deste cartão.');
      setVincularCartao(false);
      await recarregar();
    } catch (e) { setErr(extractError(e)); throw e; }
  };

  const desvincularCartao = async () => {
    if (!confirm('Remover o cartão vinculado? A mesada voltará a creditar saldo sem cobrança.')) return;
    try {
      await api.delete(`/mesadas/estudante/${estudanteId}/cartao`);
      setAviso('Cartão removido. Mesada agora é apenas crédito.');
      await recarregar();
    } catch (e) { setErr(extractError(e)); }
  };

  if (!carregado) return null;

  return (
    <form onSubmit={salvar} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor por crédito">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">R$</span>
            <input className="input pl-12" type="number" min="0.50" step="0.01"
                   value={m.valor} onChange={(e) => setM({ ...m, valor: e.target.value })} />
          </div>
        </Field>
        <Field label="Frequência">
          <select className="input" value={m.frequencia} onChange={(e) => setM({ ...m, frequencia: e.target.value })}>
            {FREQUENCIAS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
        </Field>
        {['SEMANAL', 'QUINZENAL'].includes(m.frequencia) && (
          <Field label="Dia da semana">
            <select className="input" value={m.diaSemana} onChange={(e) => setM({ ...m, diaSemana: e.target.value })}>
              {DIAS_SEMANA.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
          </Field>
        )}
        {m.frequencia === 'MENSAL' && (
          <Field label="Dia do mês (1-28)">
            <input className="input" type="number" min="1" max="28" value={m.diaMes}
                   onChange={(e) => setM({ ...m, diaMes: e.target.value })} />
          </Field>
        )}
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={m.ativa} onChange={(e) => setM({ ...m, ativa: e.target.checked })} />
        Mesada ativa
      </label>

      {m.ultimaExecucao && (
        <p className="text-xs text-slate-500">Último crédito: <b>{m.ultimaExecucao}</b>. Próximo segue o cronograma.</p>
      )}

      {err && <div className="bg-red-50 border border-red-200 text-red-600 p-2 rounded-lg text-xs">{err}</div>}
      {aviso && <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded-lg text-xs">{aviso}</div>}

      <div className="flex gap-2">
        <button className="btn-primary text-sm" type="submit">{m.ativa ? 'Salvar mesada' : 'Salvar (pausada)'}</button>
        <button type="button" onClick={desativar} className="btn-secondary text-sm text-red-600">Remover mesada</button>
      </div>

      <div className="border-t border-slate-100 pt-3 mt-3">
        <h4 className="font-semibold text-sm text-slate-800 mb-1">Cobrar do meu cartão (recorrente)</h4>
        {m.cobrarDoCartao && m.cardBandeira ? (
          <div className="flex items-center gap-2 text-sm bg-violet-50 border border-violet-200 rounded-lg p-3">
            <span>💳 <b>{m.cardBandeira}</b> •••• <b>{m.cardUltimos4}</b></span>
            <span className="text-xs text-violet-700 ml-auto">cobrança a cada execução</span>
            <button type="button" onClick={desvincularCartao} className="text-xs text-red-600 hover:underline">Remover</button>
          </div>
        ) : !vincularCartao ? (
          <button type="button" onClick={() => setVincularCartao(true)} className="btn-secondary text-sm">
            💳 Vincular cartão para cobrança recorrente
          </button>
        ) : (
          <SalvarCartaoBrick onTokenObtido={tokenSalvar} onErro={(msg) => setErr(msg)} />
        )}
        {m.ultimaFalhaCobranca && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-xs mt-2">
            ⚠ Última cobrança falhou: {m.ultimaFalhaCobranca}
          </div>
        )}
        <p className="text-[10px] text-slate-400 mt-1">
          Quando vinculado, a cada execução da mesada cobramos seu cartão antes de creditar o saldo.
          Sem cartão, a mesada apenas credita saldo (modo simples).
        </p>
      </div>

      <p className="text-[10px] text-slate-400">A mesada é creditada automaticamente toda manhã (job 8h), conforme o cronograma.</p>
    </form>
  );
}
