export const brl = (value) => {
  const v = Number(value ?? 0);
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR');
};

export const extractError = (err) => {
  return err?.response?.data?.message
      || (err?.response?.data?.erros ? Object.values(err.response.data.erros).join(', ') : null)
      || err?.message
      || 'Erro inesperado';
};
