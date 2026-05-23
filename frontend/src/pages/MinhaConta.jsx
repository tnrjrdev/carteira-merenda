import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { extractError, formatDateTime } from '../utils/format.js';

export default function MinhaConta() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [err, setErr] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    api.get('/me').then(({ data }) => setMe(data)).catch((e) => setErr(extractError(e)));
  }, []);

  const exportar = async () => {
    try {
      const { data } = await api.get('/lgpd/exportar');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meus-dados-merenda.json';
      a.click();
      URL.revokeObjectURL(url);
      setAviso('Download iniciado.');
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const aceitarPolitica = async () => {
    try {
      await api.post('/lgpd/aceitar', {});
      const { data } = await api.get('/me');
      setMe(data);
      setAviso('Consentimento registrado.');
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const excluir = async () => {
    if (!confirmExcluir) { setConfirmExcluir(true); return; }
    setExcluindo(true);
    try {
      await api.delete('/lgpd/conta');
      logout();
      navigate('/');
    } catch (e) {
      setErr(extractError(e));
      setExcluindo(false);
    }
  };

  if (err) return (
    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl">{err}</div>
  );
  if (!me) return <div className="text-slate-500">Carregando…</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-10">
      <header>
        <h1 className="text-3xl font-display font-bold text-slate-900">Minha conta</h1>
        <p className="text-sm text-slate-500 mt-1">Seus dados pessoais e privacidade</p>
      </header>

      {aviso && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">{aviso}</div>}

      <section className="card">
        <h2 className="font-display font-bold text-lg text-slate-900 mb-4">Dados cadastrais</h2>
        <dl className="grid sm:grid-cols-2 gap-y-3 text-sm">
          <dt className="text-slate-500">Nome</dt><dd className="font-semibold text-slate-800">{me.nome}</dd>
          <dt className="text-slate-500">E-mail</dt><dd className="font-mono text-slate-800">{me.email}</dd>
          <dt className="text-slate-500">Perfil</dt><dd className="font-semibold">{me.role}</dd>
          {me.dataNascimento && <><dt className="text-slate-500">Nascimento</dt><dd>{me.dataNascimento}</dd></>}
          {me.telefone && <><dt className="text-slate-500">Telefone</dt><dd>{me.telefone}</dd></>}
          {me.cpf && <><dt className="text-slate-500">CPF</dt><dd className="font-mono">{me.cpf}</dd></>}
          {me.cantinaNome && <><dt className="text-slate-500">Cantina</dt><dd>{me.cantinaNome}</dd></>}
          {me.alergias && <><dt className="text-slate-500">Alergias</dt><dd className="text-red-600 font-semibold">{me.alergias}</dd></>}
        </dl>
      </section>

      <section className="card">
        <h2 className="font-display font-bold text-lg text-slate-900 mb-2">Privacidade (LGPD)</h2>
        <div className="text-sm text-slate-600">
          {me.consentimentoLgpd
            ? <>Você aceitou a política em <b>{formatDateTime(me.consentimentoLgpdEm)}</b>, versão <code className="bg-slate-100 px-1 rounded">{me.consentimentoVersao || '?'}</code>.</>
            : <span className="text-amber-600">Consentimento LGPD pendente.</span>}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/politica-privacidade" target="_blank" className="btn-secondary text-sm">Ver política</Link>
          {!me.consentimentoLgpd && <button onClick={aceitarPolitica} className="btn-primary text-sm">Aceitar agora</button>}
          <button onClick={exportar} className="btn-secondary text-sm">⬇ Exportar meus dados (JSON)</button>
        </div>
      </section>

      <section className="card border-red-200">
        <h2 className="font-display font-bold text-lg text-red-700 mb-2">Excluir minha conta</h2>
        <p className="text-sm text-slate-600">
          Sua conta será anonimizada permanentemente. Dados financeiros (transações) serão mantidos por obrigação legal,
          mas sem qualquer vínculo identificável com você.
        </p>
        {confirmExcluir && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
            Tem certeza? Esta ação é <b>irreversível</b>.
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={excluir} disabled={excluindo}
                  className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 px-4 py-2 rounded-lg">
            {excluindo ? 'Excluindo…' : confirmExcluir ? 'Sim, excluir definitivamente' : 'Excluir minha conta'}
          </button>
          {confirmExcluir && (
            <button onClick={() => setConfirmExcluir(false)} className="btn-secondary text-sm">Cancelar</button>
          )}
        </div>
      </section>
    </div>
  );
}
