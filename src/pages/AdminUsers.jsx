import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEmployeeSecure, listEmployeesSecure, saveEmployeeSecure } from '@/api/employeeAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, RefreshCw, ShieldCheck, User, Copy, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { getSession } from '@/components/auth/AuthEmployee';

const EMPTY_FORM = {
  name: '',
  username: '',
  password: '',
  role: 'employee',
  can_add_resident: false,
  can_edit_resident: false,
  can_delete_resident: false,
  can_register_delivery: true,
  is_active: true,
};

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const PERM_LABELS = [
  { key: 'can_add_resident', label: 'Incluir Morador' },
  { key: 'can_edit_resident', label: 'Editar Morador' },
  { key: 'can_delete_resident', label: 'Deletar Morador' },
  { key: 'can_register_delivery', label: 'Registrar Entrega' },
];

export default function AdminUsers() {
  const session = getSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [generatedPass, setGeneratedPass] = useState('');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await listEmployeesSecure();
      return response?.employees || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => saveEmployeeSecure({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      closeDialog();
      toast.success('Funcionario criado!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => saveEmployeeSecure({ employeeId: id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      closeDialog();
      toast.success('Funcionario atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteEmployeeSecure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Funcionario removido!');
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setGeneratedPass('');
    setOpen(true);
  }

  function openEdit(employee) {
    setEditing(employee);
    setForm({ ...EMPTY_FORM, ...employee, password: '' });
    setGeneratedPass('');
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setGeneratedPass('');
  }

  function handleGenPass() {
    const password = generatePassword();
    setGeneratedPass(password);
    setForm((current) => ({ ...current, password }));
  }

  function copyPass() {
    navigator.clipboard.writeText(generatedPass);
    toast.success('Senha copiada!');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.name || !form.username || (!editing && !form.password)) {
      toast.error(editing ? 'Preencha nome e usuario.' : 'Preencha nome, usuario e senha.');
      return;
    }

    const payload = {
      ...form,
      username: form.username.trim().toLowerCase(),
    };

    if (!form.password) {
      delete payload.password;
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  if (session?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
        <ShieldCheck className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-muted-foreground">Acesso restrito a administradores</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestao de Usuarios</h1>
          <p className="text-muted-foreground mt-1">Cadastre funcionarios e defina permissoes de acesso</p>
        </div>
        <div className="flex gap-2">
          <a href="/QRCode" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </Button>
          </a>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Usuario
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhum funcionario cadastrado</p>
            <p className="text-sm mt-1">Clique em "Novo Usuario" para comecar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((employee) => (
            <Card key={employee.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{employee.name}</p>
                      {employee.role === 'admin' && <Badge className="bg-primary/10 text-primary text-xs">Admin</Badge>}
                      {!employee.is_active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">@{employee.username}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(employee)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(employee.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {employee.role !== 'admin' && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {PERM_LABELS.filter((permission) => employee[permission.key]).map((permission) => (
                      <Badge key={permission.key} variant="secondary" className="text-xs">
                        {permission.label}
                      </Badge>
                    ))}
                    {!PERM_LABELS.some((permission) => employee[permission.key]) && (
                      <span className="text-xs text-muted-foreground">Sem permissoes especiais</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuario' : 'Novo Usuario'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome completo *</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Joao da Silva"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Usuario *</Label>
                <Input
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  placeholder="joao.silva"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Acesso</Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Funcionario</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{editing ? 'Nova senha' : 'Senha *'}</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder={editing ? 'Deixe em branco para manter a senha atual' : 'Digite ou gere uma senha'}
                  className="flex-1 font-mono"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleGenPass} title="Gerar senha">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {generatedPass && (
                  <Button type="button" variant="outline" size="icon" onClick={copyPass} title="Copiar senha">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {generatedPass && (
                <p className="text-xs text-muted-foreground">
                  Senha gerada: <span className="font-mono font-semibold text-foreground">{generatedPass}</span>
                </p>
              )}
              {editing && !generatedPass && (
                <p className="text-xs text-muted-foreground">Se nao informar nova senha, a atual sera mantida.</p>
              )}
            </div>

            {form.role === 'employee' && (
              <div className="space-y-3 border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground">Permissoes</p>
                {PERM_LABELS.map((permission) => (
                  <div key={permission.key} className="flex items-center justify-between">
                    <Label className="font-normal text-sm cursor-pointer">{permission.label}</Label>
                    <Switch
                      checked={!!form[permission.key]}
                      onCheckedChange={(value) => setForm({ ...form, [permission.key]: value })}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <Switch checked={!!form.is_active} onCheckedChange={(value) => setForm({ ...form, is_active: value })} />
                <Label className="font-normal text-sm">Conta ativa</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
