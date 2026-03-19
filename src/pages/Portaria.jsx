import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Package, UserPlus, KeyRound } from 'lucide-react';

export default function Portaria() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="text-center max-w-md w-full">
        <div className="mb-12">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Portaria Fácil</h1>
          <p className="text-muted-foreground">Gestão de Entregas</p>
        </div>

        <div className="space-y-3">
          <Link to="/Register" className="block">
            <Button size="lg" className="w-full gap-2 h-12">
              <UserPlus className="h-5 w-5" />
              Cadastre-se aqui Morador
            </Button>
          </Link>
          
          <Link to="/KeywordForm" className="block">
            <Button size="lg" variant="outline" className="w-full gap-2 h-12">
              <KeyRound className="h-5 w-5" />
              Palavra chave
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}