import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';

export default function PoliticaPrivacidade() {
  const [versao, setVersao] = useState('');

  useEffect(() => {
    api.get('/lgpd/politica').then(({ data }) => setVersao(data?.versao || '')).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow border border-slate-200 p-6 sm:p-10">
        <Link to="/" className="text-sm text-merenda-600 hover:underline">← Voltar</Link>
        <h1 className="font-display font-bold text-3xl text-slate-900 mt-4">Política de Privacidade</h1>
        <p className="text-sm text-slate-500 mt-1">Versão {versao || 'em consulta'} · Atualizada conforme a LGPD (Lei 13.709/2018) e o ECA Digital (Lei 14.811/2024).</p>

        <section className="prose prose-slate max-w-none mt-8 space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-800">1. Quem somos</h2>
            <p className="text-slate-600">O Merenda é uma carteira digital escolar operada por <b>Merenda LTDA</b> (mocked), inscrita no CNPJ XX.XXX.XXX/0001-XX.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-slate-800">2. Dados que coletamos</h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-1">
              <li><b>Responsável:</b> nome, e-mail, telefone, CPF, data de nascimento.</li>
              <li><b>Estudante (menor):</b> nome, e-mail de acesso, data de nascimento, lista de alergias informada pelo responsável.</li>
              <li><b>Cantina:</b> dados cadastrais da empresa e dos operadores.</li>
              <li><b>Transacionais:</b> recargas, compras, pedidos, mesadas, pagamentos de mensalidade SaaS.</li>
              <li><b>Técnicos:</b> tokens de push, logs de acesso, endereço IP (segurança).</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-slate-800">3. Base legal e finalidade</h2>
            <p className="text-slate-600">Tratamos os dados com base em: (i) execução de contrato (uso da carteira digital);
              (ii) consentimento explícito do responsável legal pelo menor (ECA Digital);
              (iii) cumprimento de obrigações legais fiscais e contábeis.
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-slate-800">4. Compartilhamento</h2>
            <p className="text-slate-600">Compartilhamos dados estritamente necessários com:</p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1">
              <li><b>Gateways de pagamento</b> (Mercado Pago e similares) — somente o necessário para processar Pix, boleto e cartão.</li>
              <li><b>Cantina</b> em que o aluno compra — saldo, alergias e produtos comprados, para fins de operação e segurança alimentar.</li>
              <li><b>Autoridades públicas</b> mediante ordem judicial.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-slate-800">5. Seus direitos (LGPD art. 18)</h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-1">
              <li>Acesso aos seus dados (botão "Exportar dados" em <Link to="/conta" className="text-merenda-600 hover:underline">Minha conta</Link>).</li>
              <li>Correção de dados incompletos ou incorretos.</li>
              <li>Anonimização ou eliminação de dados desnecessários.</li>
              <li>Portabilidade dos dados para outro fornecedor.</li>
              <li>Revogação do consentimento (com exclusão da conta).</li>
            </ul>
            <p className="text-slate-600 mt-2">Importante: dados financeiros (transações) são preservados por obrigação legal (Receita Federal), mesmo após a anonimização da conta.</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-slate-800">6. Segurança</h2>
            <p className="text-slate-600">Senhas em BCrypt, JWT assinado HMAC-SHA256, criptografia TLS em todas as conexões, tokens de pagamento efêmeros (TTL de 90 segundos para QR e 30 para NFC).</p>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-slate-800">7. Encarregado de Dados (DPO)</h2>
            <p className="text-slate-600">Para exercer seus direitos ou tirar dúvidas: <a href="mailto:dpo@merenda.com" className="text-merenda-600 hover:underline">dpo@merenda.com</a>.</p>
          </div>
        </section>

        <div className="mt-10 pt-6 border-t border-slate-200 text-xs text-slate-400">
          Esta é uma versão modelo. Antes de produção, submeta o texto à revisão jurídica.
        </div>
      </div>
    </div>
  );
}
