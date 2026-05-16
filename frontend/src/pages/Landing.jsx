import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// ---------- Subcomponents ----------

const Nav = ({ user }) => (
  <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-white/60">
    <div className="container-narrow flex items-center justify-between h-16">
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-merenda-400 to-merenda-600 text-white flex items-center justify-center text-lg font-display font-bold shadow-md group-hover:scale-105 transition-transform">M</div>
        <span className="font-display text-xl font-bold text-slate-900 tracking-tight">Merenda</span>
      </Link>

      <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
        <a href="#features" className="hover:text-merenda-600 transition-colors">Funcionalidades</a>
        <a href="#para-quem" className="hover:text-merenda-600 transition-colors">Para quem</a>
        <a href="#planos" className="hover:text-merenda-600 transition-colors">Planos</a>
        <a href="#contato" className="hover:text-merenda-600 transition-colors">Contato</a>
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <Link to={defaultRoute(user.role)} className="btn-primary text-sm">Ir para o app</Link>
        ) : (
          <>
            <Link to="/login" className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2">Entrar</Link>
            <Link to="/register" className="btn-primary text-sm">Começar grátis</Link>
          </>
        )}
      </div>
    </div>
  </nav>
);

const Hero = () => (
  <section className="relative overflow-hidden bg-[#ffeed8]">
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#ffe6c8] via-[#ffeed8] to-[#fff3e0]"></div>
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-merenda-300/20 blur-3xl animate-blob -z-10"></div>
    <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-orange-200/25 blur-3xl animate-blob -z-10" style={{ animationDelay: '2s' }}></div>

    <div className="container-narrow py-16 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <div className="animate-fade-in">
        <span className="badge bg-merenda-50 text-merenda-700 border border-merenda-100 normal-case tracking-normal text-sm font-medium gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Seguro · LGPD · ECA Digital
        </span>

        <h1 className="mt-5 text-5xl md:text-6xl lg:text-7xl font-display font-extrabold text-slate-900 tracking-tight leading-[1.05]">
          A carteira digital que <span className="bg-gradient-to-r from-merenda-500 to-merenda-700 bg-clip-text text-transparent">transforma</span> a hora do lanche
        </h1>

        <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
          Os pais recarregam via Pix, os alunos pagam por QR Code e a cantina vende sem fila. Controle, agilidade e segurança em um só app.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a href="#contato" className="btn-primary text-base px-6 py-3.5 shadow-glow">
            Agendar demonstração
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </a>
          <a href="#planos" className="btn-secondary text-base px-6 py-3.5">Ver planos</a>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-700">
          {['Sem dinheiro físico', 'Notificação em tempo real', 'Bloqueio nutricional'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-merenda-100 text-merenda-700 inline-flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative animate-slide-up">
        <HeroMock />
      </div>
    </div>

    <TrustBar />
  </section>
);

const HeroFallback = () => (
  <div className="absolute inset-0 bg-gradient-to-br from-merenda-100 via-orange-50 to-merenda-200 flex flex-col items-center justify-center p-8 text-center">
    <div className="w-24 h-24 rounded-full bg-white/60 backdrop-blur flex items-center justify-center shadow-md mb-4">
      <svg className="w-12 h-12 text-merenda-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h.01M9 9h.01M12 18a9 9 0 110-18 9 9 0 010 18zm-3-7s.5 2 3 2 3-2 3-2" />
      </svg>
    </div>
    <p className="font-display font-bold text-slate-700 text-lg">Adicione sua imagem aqui</p>
    <p className="text-sm text-slate-500 mt-1 max-w-xs">Coloque <code className="bg-white/70 px-1.5 py-0.5 rounded">hero-estudante.jpg</code> em <code className="bg-white/70 px-1.5 py-0.5 rounded">frontend/public/</code></p>
  </div>
);

const HeroMock = () => {
  const handleError = (e) => {
    e.currentTarget.style.display = 'none';
    const fb = e.currentTarget.nextElementSibling;
    if (fb) fb.style.display = 'flex';
  };
  return (
  <div className="relative max-w-md mx-auto lg:max-w-none">
    <div className="absolute -top-6 -left-6 w-24 h-24 bg-merenda-200/40 rounded-full blur-2xl"></div>
    <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-orange-300/40 rounded-full blur-2xl"></div>

    <div className="relative aspect-[5/4] rounded-3xl overflow-hidden shadow-glow ring-1 ring-white/40">
      <img
        src="/hero-estudante.jpg"
        alt="Estudante usando o aplicativo Merenda na cantina escolar"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        onError={handleError}
      />
      <div style={{ display: 'none' }}><HeroFallback /></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
    </div>

    <div className="absolute left-4 -bottom-6 md:left-[-6%] glass-panel bg-white p-3 pr-5 shadow-glass flex items-center gap-3 animate-float max-w-[260px]">
      <div className="w-10 h-10 rounded-full bg-merenda-50 text-merenda-600 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
      </div>
      <div className="text-xs leading-tight">
        <div className="text-slate-500">Compra realizada</div>
        <div className="font-semibold text-slate-800">Suco + Pão · R$ 8,50</div>
      </div>
    </div>
  </div>
  );
};

const TrustBar = () => (
  <div className="border-y border-slate-200/60 bg-white/40 backdrop-blur">
    <div className="container-narrow py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-slate-700">
      {[
        { i: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', t: 'Criptografia ponta a ponta' },
        { i: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', t: 'Conformidade LGPD' },
        { i: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', t: 'PWA Mobile-first' },
        { i: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z', t: 'Pagamento por QR / NFC' },
      ].map((f) => (
        <div key={f.t} className="flex items-center gap-3 text-sm font-medium">
          <span className="w-9 h-9 rounded-lg bg-merenda-50 text-merenda-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.i} /></svg>
          </span>
          {f.t}
        </div>
      ))}
    </div>
  </div>
);

const Features = () => {
  const items = [
    {
      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      title: 'Recarga via Pix em segundos',
      text: 'Mesada programada, recarga manual ou automática. Sem trocado, sem dinheiro físico, sem stress.',
    },
    {
      icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
      title: 'QR Code dinâmico',
      text: 'Token único de uso por compra, com expiração curta. Pagamento por aproximação NFC opcional.',
    },
    {
      icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
      title: 'Cantina sem fila',
      text: 'PDV ágil com leitura do QR, baixa de estoque e relatórios em tempo real. Foco no recreio curto.',
    },
    {
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      title: 'Bloqueio nutricional',
      text: 'Pais bloqueiam categorias (refrigerantes, frituras, alérgenos). O PDV recusa a compra automaticamente.',
    },
    {
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      title: 'Notificação em tempo real',
      text: 'A cada compra, os pais recebem o detalhe: o que foi comprado, quanto custou e quanto sobrou.',
    },
    {
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      title: 'Relatórios para a cantina',
      text: 'Vendas do dia, do mês, itens mais saídos, fechamento de caixa e repasse financeiro automático.',
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="container-narrow">
        <div className="max-w-2xl">
          <span className="badge bg-merenda-50 text-merenda-700 border border-merenda-100 normal-case tracking-normal text-xs font-medium">Funcionalidades</span>
          <h2 className="section-title mt-3">Tudo que sua escola precisa, em um só lugar</h2>
          <p className="section-subtitle mt-4">Construído para a velocidade do recreio e a tranquilidade dos pais. Da recarga ao fechamento de caixa, a Merenda cobre o ciclo todo.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {items.map((f) => (
            <div key={f.title} className="card group hover:shadow-glass-hover hover:-translate-y-1 transition-all duration-300">
              <div className="feature-icon group-hover:bg-merenda-100 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
              </div>
              <h3 className="mt-5 text-lg font-display font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ParaQuem = () => {
  const personas = [
    {
      tag: 'Para o Estudante',
      title: 'Compra rápida, sem trocado',
      text: 'Saldo na palma da mão, QR Code dinâmico, cardápio do dia. Visual gamificado e simples para crianças de 8 a 17 anos.',
      points: ['Saldo em tempo real', 'QR Code de uso único', 'Cardápio digital'],
      to: '/login',
      cta: 'Acessar app do aluno',
      gradient: 'from-merenda-500 to-orange-600',
    },
    {
      tag: 'Para o Responsável',
      title: 'Controle total, zero preocupação',
      text: 'Recarregue por Pix, defina limites diário e semanal, bloqueie categorias específicas e acompanhe cada compra em tempo real.',
      points: ['Limites de gastos', 'Bloqueio nutricional', 'Extrato em tempo real'],
      to: '/register',
      cta: 'Criar conta de responsável',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      tag: 'Para a Cantina',
      title: 'Recreio sem fila, caixa sem troco',
      text: 'PDV ágil, relatórios automáticos, controle de estoque e zero inadimplência. O recreio de 15 minutos finalmente cabe.',
      points: ['PDV por QR/NFC', 'Relatórios em tempo real', 'Gestão de estoque'],
      to: '/register',
      cta: 'Quero para minha cantina',
      gradient: 'from-emerald-500 to-teal-600',
    },
  ];
  return (
    <section id="para-quem" className="py-20 lg:py-28 bg-gradient-to-b from-white to-slate-50/50">
      <div className="container-narrow">
        <div className="max-w-2xl">
          <span className="badge bg-merenda-50 text-merenda-700 border border-merenda-100 normal-case tracking-normal text-xs font-medium">Para quem</span>
          <h2 className="section-title mt-3">Três experiências, um ecossistema</h2>
          <p className="section-subtitle mt-4">Cada perfil tem seu app, suas permissões e suas métricas — todos conectados na mesma carteira.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {personas.map((p) => (
            <div key={p.tag} className="card flex flex-col group hover:-translate-y-1 hover:shadow-glass-hover transition-all duration-300">
              <div className={`text-xs font-semibold uppercase tracking-wider bg-gradient-to-r ${p.gradient} bg-clip-text text-transparent`}>{p.tag}</div>
              <h3 className="mt-2 text-2xl font-display font-bold text-slate-900">{p.title}</h3>
              <p className="mt-3 text-slate-600 leading-relaxed text-sm flex-1">{p.text}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-slate-700">
                    <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${p.gradient} text-white inline-flex items-center justify-center`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
              <Link to={p.to} className="mt-6 inline-flex items-center text-sm font-semibold text-merenda-600 hover:text-merenda-700 group/link">
                {p.cta}
                <svg className="w-4 h-4 ml-1 transition-transform group-hover/link:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Como = () => {
  const steps = [
    { n: '01', t: 'Cadastre seu filho', d: 'O responsável cria a conta e adiciona os dependentes. Cada criança recebe seu login.' },
    { n: '02', t: 'Recarregue por Pix', d: 'Defina limites diário e semanal, ative bloqueios nutricionais e configure mesada programada.' },
    { n: '03', t: 'A criança gera o QR', d: 'No recreio, o aluno gera um QR Code dinâmico (expira em 90s) e mostra ao operador da cantina.' },
    { n: '04', t: 'Cantina cobra e pronto', d: 'O PDV valida saldo, limites e bloqueios. Você recebe a notificação em tempo real.' },
  ];
  return (
    <section className="py-20 lg:py-24">
      <div className="container-narrow">
        <div className="max-w-2xl">
          <span className="badge bg-merenda-50 text-merenda-700 border border-merenda-100 normal-case tracking-normal text-xs font-medium">Como funciona</span>
          <h2 className="section-title mt-3">Do cadastro ao primeiro lanche em 4 passos</h2>
        </div>
        <ol className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <li key={s.n} className="relative card">
              <div className="text-5xl font-display font-extrabold bg-gradient-to-br from-merenda-400 to-merenda-600 bg-clip-text text-transparent">{s.n}</div>
              <h3 className="mt-3 font-display font-bold text-lg text-slate-900">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

const Planos = () => {
  const planos = [
    {
      nome: 'Essencial',
      preco: 'R$ 199',
      sufixo: '/mês por cantina',
      desc: 'Para cantinas começando a digitalizar.',
      features: ['PDV ilimitado', 'Recargas Pix', 'Até 300 alunos ativos', 'Suporte por e-mail'],
      cta: 'Começar grátis',
      destaque: false,
    },
    {
      nome: 'Escola',
      preco: 'R$ 399',
      sufixo: '/mês por cantina',
      desc: 'Para escolas que querem o ecossistema completo.',
      features: ['Tudo do Essencial', 'Alunos ilimitados', 'Limites + bloqueios nutricionais', 'Relatórios avançados', 'Suporte prioritário'],
      cta: 'Falar com vendas',
      destaque: true,
    },
    {
      nome: 'Rede',
      preco: 'Sob consulta',
      sufixo: '',
      desc: 'Para redes de escolas e franquias.',
      features: ['Multi-cantina', 'SSO corporativo', 'Integração ERP', 'Gerente de conta dedicado'],
      cta: 'Solicitar proposta',
      destaque: false,
    },
  ];
  return (
    <section id="planos" className="py-20 lg:py-28 bg-gradient-to-b from-slate-50/50 to-white">
      <div className="container-narrow">
        <div className="max-w-2xl mx-auto text-center">
          <span className="badge bg-merenda-50 text-merenda-700 border border-merenda-100 normal-case tracking-normal text-xs font-medium">Planos</span>
          <h2 className="section-title mt-3">Preço justo, sem letrinhas</h2>
          <p className="section-subtitle mt-4">Comece grátis no MVP. Faça upgrade conforme a operação crescer.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12 items-stretch">
          {planos.map((p) => (
            <div key={p.nome}
                 className={`relative rounded-2xl p-7 border transition-all duration-300 hover:-translate-y-1 ${
                   p.destaque
                     ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-800 shadow-glow'
                     : 'bg-white/80 backdrop-blur-xl border-white/50 shadow-glass text-slate-800'
                 }`}>
              {p.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-merenda-500 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">Mais popular</span>
              )}
              <h3 className={`font-display font-bold text-2xl ${p.destaque ? 'text-white' : 'text-slate-900'}`}>{p.nome}</h3>
              <p className={`mt-2 text-sm ${p.destaque ? 'text-white/70' : 'text-slate-600'}`}>{p.desc}</p>
              <div className="mt-5">
                <span className="text-4xl font-display font-extrabold tracking-tight">{p.preco}</span>
                <span className={`text-sm ${p.destaque ? 'text-white/70' : 'text-slate-500'} ml-1`}>{p.sufixo}</span>
              </div>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${p.destaque ? 'text-white/90' : 'text-slate-700'}`}>
                    <span className={`mt-0.5 w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 ${p.destaque ? 'bg-merenda-500 text-white' : 'bg-merenda-100 text-merenda-700'}`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className={`mt-7 w-full inline-flex items-center justify-center font-semibold rounded-xl py-3 transition ${
                p.destaque ? 'bg-merenda-500 hover:bg-merenda-600 text-white shadow-md' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTA = () => (
  <section id="contato" className="py-20 lg:py-24">
    <div className="container-narrow">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-merenda-500 to-merenda-700 text-white p-10 md:p-16 shadow-glow text-center">
        <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-30%] left-[-10%] w-72 h-72 bg-black/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight">Pronto para acabar com a fila da cantina?</h2>
          <p className="mt-4 text-lg text-white/90 leading-relaxed">Junte-se às escolas que já estão modernizando o intervalo com o Merenda.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:contato@merenda.app?subject=Quero%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20Merenda"
               className="inline-flex items-center justify-center gap-2 bg-white text-merenda-700 font-semibold rounded-xl px-6 py-3.5 shadow-md hover:scale-[1.02] transition">
              Agendar demonstração
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
            <a href="#planos" className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur border border-white/30 text-white font-semibold rounded-xl px-6 py-3.5 hover:bg-white/15 transition">
              Ver planos
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-slate-900 text-slate-300">
    <div className="container-narrow py-14 grid md:grid-cols-4 gap-10">
      <div className="md:col-span-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-merenda-400 to-merenda-600 text-white flex items-center justify-center text-lg font-display font-bold shadow-md">M</div>
          <span className="font-display text-xl font-bold text-white tracking-tight">Merenda</span>
        </div>
        <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-sm">
          Carteira digital escolar feita para a velocidade do recreio e a tranquilidade dos pais. Em conformidade com LGPD e ECA Digital.
        </p>
      </div>
      <div>
        <h4 className="text-white font-semibold mb-3">Produto</h4>
        <ul className="space-y-2 text-sm">
          <li><a href="#features" className="hover:text-white">Funcionalidades</a></li>
          <li><a href="#para-quem" className="hover:text-white">Para quem</a></li>
          <li><a href="#planos" className="hover:text-white">Planos</a></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-semibold mb-3">Empresa</h4>
        <ul className="space-y-2 text-sm">
          <li><a href="mailto:contato@merenda.app" className="hover:text-white">Contato</a></li>
          <li><a href="#" className="hover:text-white">Privacidade</a></li>
          <li><a href="#" className="hover:text-white">Termos</a></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/10">
      <div className="container-narrow py-5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Merenda. Todos os direitos reservados.</span>
        <span>Feito com 🧡 para escolas brasileiras.</span>
      </div>
    </div>
  </footer>
);

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="bg-white">
      <Nav user={user} />
      <Hero />
      <Features />
      <ParaQuem />
      <Como />
      <Planos />
      <CTA />
      <Footer />
    </div>
  );
}

function defaultRoute(role) {
  switch (role) {
    case 'RESPONSAVEL': return '/responsavel';
    case 'ESTUDANTE': return '/estudante';
    case 'CANTINA': return '/cantina';
    case 'ADMIN': return '/responsavel';
    default: return '/login';
  }
}
