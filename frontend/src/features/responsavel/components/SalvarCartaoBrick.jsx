import { useEffect, useMemo, useState } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';
let mpInicializado = false;

/**
 * Brick reduzido para captura de cartão SEM cobrar (apenas tokenizar).
 * Usa o CardPayment Brick e ignora o pagamento — a chamada de salvarCartão
 * acontece no backend, que repassa o token ao Mercado Pago Customers/Cards API.
 *
 * Como o CardPayment Brick exige um amount, usamos R$ 1,00 como referência
 * (não é cobrado — o backend nem chama /payments).
 */
export default function SalvarCartaoBrick({ onTokenObtido, onErro }) {
  const [pronto, setPronto] = useState(false);
  const temPublicKey = useMemo(() => !!MP_PUBLIC_KEY, []);

  useEffect(() => {
    if (!temPublicKey) return;
    if (!mpInicializado) {
      initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
      mpInicializado = true;
    }
    setPronto(true);
  }, [temPublicKey]);

  if (!temPublicKey) {
    return (
      <div className="border border-amber-300 bg-amber-50 rounded-xl p-3 text-xs text-amber-800">
        Defina <code>VITE_MERCADOPAGO_PUBLIC_KEY</code> no <code>.env</code> para vincular um cartão real.
      </div>
    );
  }
  if (!pronto) return <div className="text-xs text-slate-500">Carregando formulário…</div>;

  return (
    <div className="border border-slate-200 rounded-xl p-2 bg-slate-50">
      <CardPayment
        initialization={{ amount: 1 }}
        customization={{
          paymentMethods: { maxInstallments: 1 },
          visual: {
            hidePaymentButton: false,
            style: { theme: 'default' },
            texts: { formSubmit: 'Salvar cartão' },
          },
        }}
        onSubmit={async (formData) => {
          try {
            await onTokenObtido({
              cardToken: formData.token,
              paymentMethodId: formData.payment_method_id,
              issuerId: formData.issuer_id ? String(formData.issuer_id) : null,
            });
          } catch (e) {
            onErro?.(e?.message || 'Falha ao salvar cartão');
            throw e;
          }
        }}
        onError={(e) => onErro?.(typeof e === 'string' ? e : (e?.message || 'Erro no formulário'))}
      />
      <p className="text-[10px] text-slate-500 mt-2">
        ⓘ Cartão tokenizado pelo Mercado Pago no navegador — o backend só recebe um token descartável.
        Não cobramos nada neste passo.
      </p>
    </div>
  );
}
