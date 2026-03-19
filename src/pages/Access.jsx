import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginEmployeeWithPassword } from '@/api/employeeAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, Package, Eye, EyeOff, Lock, User } from 'lucide-react';
import { loginEmployee } from '@/components/auth/AuthEmployee';
import { toast } from 'sonner';
import { getTenantSlug, rememberTenantSlug } from '@/lib/tenantContext';

export default function Access() {
  const navigate = useNavigate();
  const [tenantSlug, setTenantSlug] = useState(() => getTenantSlug());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedTenantSlug = tenantSlug.trim().toLowerCase();
      if (normalizedTenantSlug) {
        rememberTenantSlug(normalizedTenantSlug);
      }

      const response = await loginEmployeeWithPassword({
        tenantSlug: normalizedTenantSlug || undefined,
        username: username.trim().toLowerCase(),
        password,
      });

      if (!response?.success || !response.employee || !response.sessionToken) {
        throw new Error(response?.error || 'Nao foi possivel autenticar.');
      }

      loginEmployee({
        ...response.employee,
        sessionToken: response.sessionToken,
      });
      navigate('/Dashboard');
    } catch (error) {
      toast.error(error?.message || 'Usuario ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-primary items-center justify-center mb-4 shadow-2xl shadow-primary/40">
            <Package className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Portaria Facil</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Gestao de Entregas</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold text-foreground mb-6 text-center">Acesse sua conta</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label>Cliente / Tenant</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="ex: jardim_aurora"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="seu.usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading || !username || !password}>
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
