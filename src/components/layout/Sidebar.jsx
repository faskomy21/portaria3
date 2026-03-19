import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, DoorOpen, Users, Package, ScanLine, Menu, X, LogOut, ShieldCheck, BarChart2, KeyRound, PackageX, ClipboardCheck, BookOpen, MessageCircle, FileSearch, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSession, logoutEmployee } from '@/components/auth/AuthEmployee';

const ALL_NAV = [
  { path: '/Dashboard', label: 'Painel', icon: LayoutDashboard },
  { path: '/Deliveries', label: 'Entregas', icon: Package },
  { path: '/NewDelivery', label: 'Nova Entrega', icon: ScanLine },
  { path: '/Blocks', label: 'Blocos', icon: Building2 },
  { path: '/Apartments', label: 'Apartamentos', icon: DoorOpen },
  { path: '/Residents', label: 'Moradores', icon: Users },
  { path: '/Keywords', label: 'Palavras-chave', icon: KeyRound },
  { path: '/RefusedDeliveries', label: 'Recusadas', icon: PackageX },
  { path: '/Reports', label: 'Relatórios', icon: BarChart2, managerAndAdmin: true },
  { path: '/Audit', label: 'Auditoria', icon: FileSearch, adminOnly: true },
  { path: '/Tutorial', label: 'Tutorial', icon: BookOpen },
  { path: '/Approvals', label: 'Aprovações', icon: ClipboardCheck, managerAndAdmin: true },
  { path: '/AdminUsers', label: 'Usuários', icon: ShieldCheck, adminOnly: true },
  { path: '/Tenants', label: 'Tenants', icon: Layers3, adminOnly: true },
  { path: '/WhatsApp', label: 'WhatsApp', icon: MessageCircle, adminOnly: true },
];

export default function Sidebar({ isOpen, onToggle }) {
   const location = useLocation();
   const session = getSession();
   const navItems = ALL_NAV.filter(item => {
     if (item.adminOnly) return session?.role === 'admin';
     if (item.managerAndAdmin) return ['admin', 'gerente'].includes(session?.role);
     return true;
   });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />
      )}

      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-card shadow-md"
        onClick={onToggle}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
                <Package className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Portaria Fácil</h1>
                <p className="text-xs text-sidebar-foreground/60">Gestão de Entregas</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && onToggle()}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info + Logout */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            {session && (
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-sidebar-foreground/90 truncate">{session.name}</p>
                <p className="text-xs text-sidebar-foreground/50">{session.role === 'admin' ? 'Administrador' : session.role === 'gerente' ? 'Gerente' : 'Funcionário'}</p>
              </div>
            )}
            <button
              onClick={() => { logoutEmployee(); window.location.href = '/Access'; }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200 w-full"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
