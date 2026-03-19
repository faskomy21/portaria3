import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyCurrentEmployeePassword } from '@/api/employeeAuth';
import { AlertCircle, Lock } from 'lucide-react';

export default function PasswordProtectedResetModal({ open, onPasswordVerified, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyPassword = async () => {
    setError('');
    setIsLoading(true);

    try {
      await verifyCurrentEmployeePassword(password);
      setPassword('');
      setError('');
      onPasswordVerified();
      onClose();
    } catch (err) {
      setError(err?.message || 'Erro ao verificar senha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            Confirmar Identidade
          </DialogTitle>
          <DialogDescription>
            Digite sua senha para prosseguir com o reset de dados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Input
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
            disabled={isLoading}
          />

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleVerifyPassword} disabled={!password || isLoading}>
            {isLoading ? 'Verificando...' : 'Confirmar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
