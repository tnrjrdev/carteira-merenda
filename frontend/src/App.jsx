import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Layout from './components/Layout.jsx';
import ResponsavelDashboard from './pages/ResponsavelDashboard.jsx';
import ResponsavelDependente from './pages/ResponsavelDependente.jsx';
import EstudanteDashboard from './pages/EstudanteDashboard.jsx';
import EstudantePedidos from './pages/EstudantePedidos.jsx';
import EstudanteConquistas from './pages/EstudanteConquistas.jsx';
import CantinaPainel from './pages/CantinaPainel.jsx';
import CantinaProdutos from './pages/CantinaProdutos.jsx';
import CantinaPDV from './pages/CantinaPDV.jsx';
import CantinaPedidos from './pages/CantinaPedidos.jsx';
import CantinaRelatorios from './pages/CantinaRelatorios.jsx';
import CantinaWebhooks from './pages/CantinaWebhooks.jsx';
import CantinaCaixa from './pages/CantinaCaixa.jsx';
import CantinaFaturas from './pages/CantinaFaturas.jsx';
import AdminRede from './pages/AdminRede.jsx';
import MinhaConta from './pages/MinhaConta.jsx';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade.jsx';

function RequireAuth({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={defaultRoute(user.role)} replace />;
  }
  return children;
}

function defaultRoute(role) {
  switch (role) {
    case 'RESPONSAVEL': return '/responsavel';
    case 'ESTUDANTE': return '/estudante';
    case 'CANTINA': return '/cantina';
    case 'ADMIN': return '/admin/rede';
    default: return '/login';
  }
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to={defaultRoute(user.role)} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={defaultRoute(user.role)} /> : <Register />} />
      <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/conta" element={<RequireAuth><MinhaConta /></RequireAuth>} />

        <Route path="/responsavel" element={<RequireAuth roles={['RESPONSAVEL', 'ADMIN']}><ResponsavelDashboard /></RequireAuth>} />
        <Route path="/responsavel/dependente/:id" element={<RequireAuth roles={['RESPONSAVEL', 'ADMIN']}><ResponsavelDependente /></RequireAuth>} />

        <Route path="/estudante" element={<RequireAuth roles={['ESTUDANTE']}><EstudanteDashboard /></RequireAuth>} />
        <Route path="/estudante/pedidos" element={<RequireAuth roles={['ESTUDANTE']}><EstudantePedidos /></RequireAuth>} />
        <Route path="/estudante/conquistas" element={<RequireAuth roles={['ESTUDANTE']}><EstudanteConquistas /></RequireAuth>} />

        <Route path="/cantina" element={<RequireAuth roles={['CANTINA']}><CantinaPainel /></RequireAuth>} />
        <Route path="/cantina/produtos" element={<RequireAuth roles={['CANTINA']}><CantinaProdutos /></RequireAuth>} />
        <Route path="/cantina/pdv" element={<RequireAuth roles={['CANTINA']}><CantinaPDV /></RequireAuth>} />
        <Route path="/cantina/pedidos" element={<RequireAuth roles={['CANTINA']}><CantinaPedidos /></RequireAuth>} />
        <Route path="/cantina/relatorios" element={<RequireAuth roles={['CANTINA']}><CantinaRelatorios /></RequireAuth>} />
        <Route path="/cantina/caixa" element={<RequireAuth roles={['CANTINA']}><CantinaCaixa /></RequireAuth>} />
        <Route path="/cantina/faturas" element={<RequireAuth roles={['CANTINA']}><CantinaFaturas /></RequireAuth>} />
        <Route path="/cantina/webhooks" element={<RequireAuth roles={['CANTINA']}><CantinaWebhooks /></RequireAuth>} />

        <Route path="/admin/rede" element={<RequireAuth roles={['ADMIN']}><AdminRede /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
