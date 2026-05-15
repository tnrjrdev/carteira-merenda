export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CPF_REGEX = /^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/;
export const TELEFONE_REGEX = /^(\d{10,11}|\(\d{2}\)\s?\d{4,5}-?\d{4})$/;

export const required = (value, label = 'Campo') =>
  value == null || String(value).trim() === '' ? `${label} é obrigatório` : null;

export const minLength = (value, n, label = 'Campo') =>
  value && value.length < n ? `${label} deve ter ao menos ${n} caracteres` : null;

export const maxLength = (value, n, label = 'Campo') =>
  value && value.length > n ? `${label} deve ter no máximo ${n} caracteres` : null;

export const email = (value) =>
  value && !EMAIL_REGEX.test(value) ? 'Email inválido' : null;

export const cpf = (value) =>
  value && !CPF_REGEX.test(value) ? 'CPF deve ter 11 dígitos ou estar no formato 000.000.000-00' : null;

export const telefone = (value) =>
  value && !TELEFONE_REGEX.test(value.replace(/\s/g, ''))
    ? 'Telefone inválido (use DDD + número)'
    : null;

export const number = (value, label = 'Valor') => {
  if (value === '' || value == null) return null;
  return isNaN(Number(value)) ? `${label} deve ser um número` : null;
};

export const min = (value, m, label = 'Valor') => {
  if (value === '' || value == null) return null;
  return Number(value) < m ? `${label} deve ser maior ou igual a ${m}` : null;
};

export const max = (value, m, label = 'Valor') => {
  if (value === '' || value == null) return null;
  return Number(value) > m ? `${label} deve ser menor ou igual a ${m}` : null;
};

export const validateForm = (rules) => {
  const errors = {};
  for (const [field, fns] of Object.entries(rules)) {
    for (const fn of fns) {
      const msg = fn();
      if (msg) { errors[field] = msg; break; }
    }
  }
  return errors;
};

export const senhaForte = (value) => {
  if (!value) return null;
  if (value.length < 6) return 'Senha deve ter ao menos 6 caracteres';
  if (value.length > 60) return 'Senha muito longa';
  return null;
};
