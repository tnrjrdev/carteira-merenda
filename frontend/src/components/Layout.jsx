import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = navLinksFor(user?.role);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-merenda-500 text-white flex items-center justify-center font-bold">M</div>
            <span className="font-bold text-lg text-slate-800">Merenda</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-merenda-50 text-merenda-700' : 'text-slate-600 hover:bg-slate-100'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-800">{user?.nome}</div>
              <div className="text-xs text-slate-500">{roleLabel(user?.role)}</div>
            </div>
            <button onClick={handleLogout} className="btn-secondary text-sm">Sair</button>
          </div>
        </div>
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex gap-1 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-lg text-sm ${isActive ? 'bg-merenda-50 text-merenda-700' : 'text-slate-600'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-slate-400 py-4">
        Merenda · Carteira digital escolar
      </footer>
    </div>
  );
}

function navLinksFor(role) {
  switch (role) {
    case 'RESPONSAVEL':
    case 'ADMIN':
      return [{ to: '/responsavel', label: 'Meus filhos' }];
    case 'ESTUDANTE':
      return [{ to: '/estudante', label: 'Minha carteira' }];
    case 'CANTINA':
      return [
        { to: '/cantina', label: 'Painel' },
        { to: '/cantina/pdv', label: 'PDV' },
        { to: '/cantina/produtos', label: 'Produtos' },
      ];
    default:
      return [];
  }
}

function roleLabel(role) {
  switch (role) {
    case 'RESPONSAVEL': return 'Responsável';
    case 'ESTUDANTE': return 'Estudante';
    case 'CANTINA': return 'Cantina';
    case 'ADMIN': return 'Administrador';
    default: return '';
  }
}
