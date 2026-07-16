'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/app-context';
import { 
  LayoutDashboard, 
  BarChart3, 
  Database,
  Ticket,
  LogOut,
  Menu,
  X,
  Bell,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

const OdooTicketsDashboard = dynamic(() => import('@/components/odoo-tickets-dashboard'), { ssr: false });
const Login = dynamic(() => import('@/components/login'), { ssr: false });

export default function TicketsDashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isAuthReady, refreshSession } = useApp();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await refreshSession();
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Simplified copy from main page */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-r border-slate-200 bg-white flex flex-col z-50"
          >
            <div className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight text-slate-900">Performance</h1>
              </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
              <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-all">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Voltar ao Início</span>
              </Link>
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboards</p>
              </div>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 text-primary font-bold transition-all"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm">Odoo Dashboard</span>
              </button>
              <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-all">
                <Ticket className="w-5 h-5" />
                <span className="text-sm">Tickets (Bitrix)</span>
              </Link>
              <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-all">
                <Database className="w-5 h-5" />
                <span className="text-sm">Dados Brutos</span>
              </Link>
              
              <div className="mt-auto pt-4 border-t border-slate-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-bold">Sair</span>
                </button>
              </div>
            </nav>

            <div className="p-4 mt-auto border-t border-slate-100">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Alpha v0.1.0</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-lg font-bold tracking-tight text-slate-800">Dashboard de Tickets (Odoo)</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
                <Bell className="w-5 h-5" />
              </button>
              <div className="h-9 w-9 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-6xl mx-auto w-full">
            <OdooTicketsDashboard />
          </div>

          {/* Background Pattern */}
          <div className="fixed inset-0 pointer-events-none -z-10 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#3713ec 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </main>
      </div>
    </div>
  );
}