import { Link } from 'react-router-dom';

export default function LgpdCheckbox({ checked, onChange, erro }) {
  return (
    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 mt-2">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded border-slate-300 text-merenda-600 focus:ring-merenda-500 accent-merenda-600"
        />
        <span className="text-xs text-slate-600 leading-relaxed">
          Li e aceito a{' '}
          <Link to="/politica-privacidade" target="_blank" className="text-merenda-600 font-semibold hover:underline">
            política de privacidade
          </Link>{' '}
          do Merenda (LGPD/ECA Digital). Se a conta é para um menor de idade,
          declaro ser o responsável legal e autorizo o tratamento dos dados informados.
        </span>
      </label>
      {erro && <p className="text-xs text-red-600 mt-2 ml-8">{erro}</p>}
    </div>
  );
}
