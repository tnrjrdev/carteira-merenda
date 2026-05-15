import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Layout from './components/Layout.jsx';
import ResponsavelDashboard from './pages/ResponsavelDashboard.jsx';
import ResponsavelDependente from './pages/ResponsavelDependente.jsx';
import EstudanteDashboard from './pages/EstudanteDashboard.jsx';
import CantinaPainel from './pages/CantinaPainel.jsx';
import CantinaProdutos from './pages/CantinaProdutos.jsx';
import CantinaPDV from './pages/CantinaPDV.jsx';

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
    case 'ADMIN': return '/responsavel';
    default: return '/login';
  }
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={defaultRoute(user.role)} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={defaultRoute(user.role)} /> : <Register />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/responsavel" element={<RequireAuth roles={['RESPONSAVEL', 'ADMIN']}><ResponsavelDashboard /></RequireAuth>} />
        <Route path="/responsavel/dependente/:id" element={<RequireAuth roles={['RESPONSAVEL', 'ADMIN']}><ResponsavelDependente /></RequireAuth>} />
        <Route path="/estudante" element={<RequireAuth roles={['ESTUDANTE']}><EstudanteDashboard /></RequireAuth>} />
        <Route path="/cantina" element={<RequireAuth roles={['CANTINA']}><CantinaPainel /></RequireAuth>} />
        <Route path="/cantina/produtos" element={<RequireAuth roles={['CANTINA']}><CantinaProdutos /></RequireAuth>} />
        <Route path="/cantina/pdv" element={<RequireAuth roles={['CANTINA']}><CantinaPDV /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to={user ? defaultRoute(user.role) : '/login'} replace />} />
    </Routes>
  );
}
