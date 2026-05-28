import { useEffect, useMemo, useState } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import api from '../../../services/api.js';
import Field from '../../../components/ui/Field.jsx';
import { brl, extractError } from '../../../utils/format.js';

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';
let mpInicializado = false;

function inicializarMp() {
  if (mpInicializado) return;
  if (!MP_PUBLIC_KEY) return;
  initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
  mpInicializado = true;
}

/**
 * Cobrança real via Mercado Pago Bricks (Card Payment).
 * Em DEV (sem VITE_MERCADOPAGO_PUBLIC_KEY) cai em modo mock com input de token de teste.
 */
export default function CartaoModal({ estudanteId, valorInicial, onClose, onAprovada }) {
  const [valor, setValor] = useState(valorInicial || '');
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [usarBrick, setUsarBrick] = useState(false);
  const [mockToken, setMockToken] = useState('OK_demo-token-' + Date.now());
  const [mockParcelas, setMockParcelas] = useState(1);

  const temPublicKey = useMemo(() => !!MP_PUBLIC_KEY, []);

  useEffect(() => { if (temPublicKey) inicializarMp(); }, [temPublicKey]);

  const valorNumerico = Number(valor) || 0;

  const cobrar = async ({ cardToken, paymentMethodId, issuerId, parcelas }) => {
    setErr(null); setSucesso(null);
    if (valorNumerico < 1) { setErr('Valor inválido'); throw new Error('valor'); }
    setEnviando(true);
    try {
      const { data } = await api.post('/carteira/recarga-cartao', {
        estudanteId,
        valor: valorNumerico,
        cardToken,
        paymentMethodId,
        issuerId,
        parcelas,
      });
      if (data.status === 'APROVADO') {
        setSucesso(data);
        setTimeout(() => onAprovada?.(data), 1200);
      } else {
        setErr(`${data.status}: ${data.mensagem || ''}`);
        throw new Error(data.mensagem || data.status);
      }
    } catch (e) {
      setErr(extractError(e));
      throw e;
    } finally { setEnviando(false); }
  };

  const submitMock = async (e) => {
    e?.preventDefault();
    try {
      await cobrar({ cardToken: mockToken, paymentMethodId: null, issuerId: null, parcelas: mockParcelas });
    } catch (_) { /* já tratado */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-glow max-w-md w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white p-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Recarga via cartão</div>
            <div className="text-sm font-display font-bold mt-0.5">Pagamento por cartão de crédito</div>
            <div className="text-xs opacity-80 mt-1">
              {temPublicKey ? 'Mercado Pago · seguro PCI' : 'Modo simulado · sem MERCADOPAGO_PUBLIC_KEY'}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">×</button>
        </div>

        <div className="p-6 space-y-4">
          {sucesso ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="font-display font-bold text-xl">Aprovado!</h3>
              <p className="text-sm text-slate-600 mt-2">
                Cobrado <b>{brl(sucesso.valor)}</b>
                {sucesso.taxaConveniencia ? <> · taxa <b>{brl(sucesso.taxaConveniencia)}</b></> : null} ·
                creditado <b className="text-green-600">{brl(sucesso.valorLiquidoCreditado || sucesso.valor)}</b>.
              </p>
              {sucesso.bandeira && <p className="text-xs text-slate-500 mt-1">{sucesso.bandeira} •••• {sucesso.ultimosDigitos}</p>}
            </div>
          ) : (
            <>
              <Field label="Valor (R$)">
                <input className="input" type="number" min="1" step="0.01" value={valor}
                       onChange={(e) => setValor(e.target.value)} />
              </Field>

              {err && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{err}</div>}

              {temPublicKey ? (
                <>
                  {!usarBrick ? (
                    <button className="btn-primary w-full" disabled={!valorNumerico || valorNumerico < 1}
                            onClick={() => setUsarBrick(true)}>
                      Continuar para pagamento
                    </button>
                  ) : (
                    <div className="border border-slate-200 rounded-xl p-2 bg-slate-50">
                      <CardPayment
                        initialization={{ amount: valorNumerico }}
                        customization={{
                          paymentMethods: { maxInstallments: 12 },
                          visual: { hidePaymentButton: false, style: { theme: 'default' } },
                        }}
                        onSubmit={async (formData) => {
                          await cobrar({
                            cardToken: formData.token,
                            paymentMethodId: formData.payment_method_id,
                            issuerId: formData.issuer_id ? String(formData.issuer_id) : null,
                            parcelas: formData.installments,
                          });
                        }}
                        onError={(e) => setErr(typeof e === 'string' ? e : (e?.message || 'Erro no formulário de cartão'))}
                      />
                      {enviando && <p className="text-xs text-slate-500 text-center mt-2">Processando…</p>}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">
                    ⓘ Cartão tokenizado pelo Mercado Pago no navegador — backend só recebe o token descartável.
                  </p>
                </>
              ) : (
                <form onSubmit={submitMock} className="space-y-4">
                  <Field label="Token simulado" hint="Use OK_*, REC_* ou ERR_* para testar status">
                    <input className="input font-mono text-sm" value={mockToken}
                           onChange={(e) => setMockToken(e.target.value)} />
                  </Field>
                  <Field label="Parcelas">
                    <select className="input" value={mockParcelas} onChange={(e) => setMockParcelas(Number(e.target.value))}>
                      {[1, 2, 3, 6, 12].map((n) => <option key={n} value={n}>{n}× sem juros</option>)}
                    </select>
                  </Field>
                  <button className="btn-primary w-full" disabled={enviando}>
                    {enviando ? 'Processando…' : 'Cobrar (mock)'}
                  </button>
                  <p className="text-[10px] text-slate-400">
                    ⓘ Defina <code>VITE_MERCADOPAGO_PUBLIC_KEY</code> no <code>.env</code> para usar o Brick real.
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
