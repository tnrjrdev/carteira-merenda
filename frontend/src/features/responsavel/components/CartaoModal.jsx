import { useState } from 'react';
import api from '../../../services/api.js';
import Field from '../../../components/ui/Field.jsx';
import { brl, extractError } from '../../../utils/format.js';

/**
 * MOCK de tokenização de cartão.
 * Em produção, integre Mercado Pago Bricks / Stripe Elements / Pagar.me Checkout.
 * O backend recebe apenas o cardToken (descartável). NÃO armazene PAN/CVV.
 *
 * Tokens de teste aceitos pelo SimulatedCartaoGateway:
 *   "OK_*"  → aprova
 *   "REC_*" → recusa
 *   "ERR_*" → erro temporário
 */
export default function CartaoModal({ estudanteId, valorInicial, onClose, onAprovada }) {
  const [valor, setValor] = useState(valorInicial || '');
  const [cardToken, setCardToken] = useState('OK_demo-token-' + Date.now());
  const [parcelas, setParcelas] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    setErr(null); setSucesso(null);
    const v = Number(valor);
    if (!v || v < 1) { setErr('Valor inválido'); return; }
    setEnviando(true);
    try {
      const { data } = await api.post('/carteira/recarga-cartao', {
        estudanteId, valor: v, cardToken, parcelas,
      });
      if (data.status === 'APROVADO') {
        setSucesso(data);
        setTimeout(() => onAprovada?.(data), 1200);
      } else {
        setErr(`${data.status}: ${data.mensagem || ''}`);
      }
    } catch (e) { setErr(extractError(e)); }
    finally { setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-glow max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white p-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Recarga via cartão</div>
            <div className="text-xs opacity-80 mt-1">Taxa de conveniência: ~4,99%</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">×</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {sucesso ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="font-display font-bold text-xl">Aprovado!</h3>
              <p className="text-sm text-slate-600 mt-2">
                Cobrado <b>{brl(sucesso.valor)}</b>, taxa <b>{brl(sucesso.taxaConveniencia)}</b>,
                creditado <b className="text-green-600">{brl(sucesso.valorLiquidoCreditado)}</b>.
              </p>
            </div>
          ) : (
            <>
              <Field label="Valor (R$)">
                <input className="input" type="number" min="1" step="0.01" value={valor}
                       onChange={(e) => setValor(e.target.value)} />
              </Field>
              <Field label="Token do cartão (mock)" hint="Em produção, gerado pelo SDK do gateway. Use OK_*, REC_* ou ERR_* aqui.">
                <input className="input font-mono text-sm" value={cardToken}
                       onChange={(e) => setCardToken(e.target.value)} />
              </Field>
              <Field label="Parcelas">
                <select className="input" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                  {[1, 2, 3, 6, 12].map((n) => <option key={n} value={n}>{n}× sem juros</option>)}
                </select>
              </Field>

              {err && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{err}</div>}

              <button className="btn-primary w-full" disabled={enviando}>
                {enviando ? 'Processando…' : 'Cobrar cartão'}
              </button>
              <p className="text-[10px] text-slate-400">ⓘ MOCK PCI-incompleto. Em produção tokenize no frontend com Bricks/Elements antes de enviar.</p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
