'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DollarSign, Mail, Lock, User, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      } else {
        // Registro
        if (!name.trim()) {
          throw new Error('El nombre es requerido');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim(), // Guardar nombre en metadatos del usuario
            },
          },
        });
        if (error) throw error;

        // Si el usuario se creó y está autenticado, crear perfil
        if (data.user && data.session) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: data.user.id, name: name.trim() });

          if (profileError) {
            console.error('Error creating profile:', profileError);
          }
        }

        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
            <DollarSign size={32} />
          </div>
          <h1 className="text-3xl font-bold">Gastos App</h1>
          <p className="text-slate-400 mt-2">
            {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="bg-slate-800 p-4 rounded-xl flex items-center gap-3">
              <User size={20} className="text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="flex-1 bg-transparent outline-none text-white placeholder-slate-500"
                required={!isLogin}
              />
            </div>
          )}

          <div className="bg-slate-800 p-4 rounded-xl flex items-center gap-3">
            <Mail size={20} className="text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 bg-transparent outline-none text-white placeholder-slate-500"
              required
            />
          </div>

          <div className="bg-slate-800 p-4 rounded-xl flex items-center gap-3">
            <Lock size={20} className="text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="flex-1 bg-transparent outline-none text-white placeholder-slate-500"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 p-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
