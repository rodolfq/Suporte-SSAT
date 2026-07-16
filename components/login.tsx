'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, Loader2, ArrowLeft, ShieldQuestion } from 'lucide-react';

export default function Login() {
  const { refreshSession } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot-password'>('login');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Erro ao realizar login. Verifique sua conexão.');

      console.log('Login realizado com sucesso.');
      await refreshSession();
    } catch (err: any) {
      console.error('Erro no login:', err);
      setError(err.message || 'Erro ao realizar login. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#3713ec 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20 mb-4">
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">SYSTEMSAT</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Performance Suporte Dashboard</p>
        </div>

        <AnimatePresence mode="wait">
          {view === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@systemsat.com.br"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                    <button
                      type="button"
                      onClick={() => setView('forgot-password')}
                      className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldQuestion className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Esqueceu sua senha?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                  O acesso é gerenciado por um administrador. Entre em contato com o administrador do sistema para redefinir sua senha.
                </p>
                <button
                  onClick={() => setView('login')}
                  className="text-primary font-bold text-sm flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para o login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Acesso restrito à equipe **SYSTEMSAT**
          </p>
          <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-2 uppercase tracking-widest">
            usr@systemsat.com.br
          </p>
        </div>
      </motion.div>
    </div>
  );
}
