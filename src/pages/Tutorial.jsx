import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Package, KeyRound, BarChart3, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';

export default function Tutorial() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="📚 Tutorial" 
        subtitle="Aprenda como usar toda a ferramenta de forma didática"
      />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Tabs defaultValue="residents" className="w-full">
          <TabsList className="flex w-full overflow-x-auto gap-1 h-auto p-1 justify-start">
            <TabsTrigger value="residents" className="whitespace-nowrap">Moradores</TabsTrigger>
            <TabsTrigger value="deliveries" className="whitespace-nowrap">Entregas</TabsTrigger>
            <TabsTrigger value="keywords" className="whitespace-nowrap">Palavras-chave</TabsTrigger>
            <TabsTrigger value="reports" className="whitespace-nowrap">Relatórios</TabsTrigger>
            <TabsTrigger value="admin" className="whitespace-nowrap">Admin</TabsTrigger>
          </TabsList>

          {/* TAB: MORADORES */}
          <TabsContent value="residents" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Registro de Moradores
                  </CardTitle>
                  <CardDescription>Como registrar e gerenciar moradores no sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">1️⃣ Auto-registro (Morador)</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        O morador acessa a aba <strong>Registrar</strong> e preenche:
                      </p>
                      <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                        <li>✓ Nome completo</li>
                        <li>✓ Telefone WhatsApp (com DDD)</li>
                        <li>✓ Bloco e número do apartamento</li>
                      </ul>
                      <p className="text-sm text-muted-foreground mt-2">
                        Após submeter, a solicitação fica <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">pendente</span> aguardando aprovação do admin.
                      </p>
                    </div>

                    <div className="pt-2 border-t">
                      <h4 className="font-semibold text-sm mb-2">2️⃣ Aprovação (Admin)</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        O admin acessa <strong>Aprovações</strong> para:
                      </p>
                      <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                        <li>✓ Revisar solicitações pendentes</li>
                        <li>✓ <span className="text-emerald-600 font-semibold">Aprovar</span> - Cria o morador automaticamente</li>
                        <li>✓ <span className="text-red-600 font-semibold">Rejeitar</span> - Com motivo opcional</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t">
                      <h4 className="font-semibold text-sm mb-2">3️⃣ Gerenciamento</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Acesse <strong>Moradores</strong> para:
                      </p>
                      <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                        <li>✓ Ver lista de todos os moradores</li>
                        <li>✓ Editar dados (nome, telefone, apartamento)</li>
                        <li>✓ Deletar moradores inativos</li>
                        <li>✓ Identificar morador primário do apartamento</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: ENTREGAS */}
          <TabsContent value="deliveries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Registrar Entregas
                </CardTitle>
                <CardDescription>Como registrar pacotes recebidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">1️⃣ Acessar Nova Entrega</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Na aba <strong>Nova Entrega</strong>, preencha:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ <strong>Código de rastreamento</strong> (escanear ou digitar)</li>
                      <li>✓ <strong>Morador destinatário</strong> (buscar por nome/apt)</li>
                      <li>✓ <strong>Transportadora</strong> (ex: Sedex, Correios)</li>
                      <li>✓ <strong>Descrição</strong> (opcional)</li>
                      <li>✓ <strong>Foto do pacote</strong> (opcional)</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t">
                    <h4 className="font-semibold text-sm mb-2">2️⃣ Usar com Palavra-chave</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Se o morador informou uma palavra-chave:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Use a aba <strong>Palavras-chave</strong> para registrar usando a palavra informada</li>
                      <li>✓ Mais rápido que buscar o morador manualmente</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t">
                   <h4 className="font-semibold text-sm mb-2">3️⃣ Sistema de Fila e Prioridade de Notificações</h4>
                   <p className="text-sm text-muted-foreground mb-2">
                     As notificações WhatsApp são enviadas de forma organizada:
                   </p>
                   <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                     <li>✓ <strong>Novas entregas</strong> - Prioridade ALTA (enviadas primeiro)</li>
                     <li>✓ <strong>Confirmações de retirada</strong> - Prioridade NORMAL</li>
                     <li>✓ Sistema processa uma notificação por vez para garantir entrega confiável</li>
                     <li>✓ Agendamentos automáticos evitam spam (máx 1 notificação a cada 5 minutos por número)</li>
                   </ul>
                   <p className="text-sm text-muted-foreground mt-2 bg-blue-50 p-2 rounded">
                     💡 <strong>Benefício:</strong> O morador sempre recebe o aviso de NOVA entrega antes da confirmação de retirada de pacotes antigos.
                   </p>
                  </div>

                  <div className="pt-2 border-t">
                   <h4 className="font-semibold text-sm mb-2">4️⃣ Acompanhar Status</h4>
                   <p className="text-sm text-muted-foreground mb-2">
                     Na aba <strong>Entregas</strong>, veja:
                   </p>
                   <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                     <li>🔴 <strong>Pendente</strong> - Aguardando retirada</li>
                     <li>🟡 <strong>Notificada</strong> - Morador foi avisado</li>
                     <li>🟢 <strong>Retirada</strong> - Coletada</li>
                   </ul>
                  </div>

                  <div className="pt-2 border-t">
                   <h4 className="font-semibold text-sm mb-2">5️⃣ Marcar como Retirada</h4>
                   <p className="text-sm text-muted-foreground mb-2">
                     Quando o morador retirar:
                   </p>
                   <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                     <li>✓ Clique <strong>"Retirado"</strong> na entrega</li>
                     <li>✓ Selecione quem retirou (pode ser outro morador do apt)</li>
                     <li>✓ Adicione observação se houver (avarias, devoluções, etc)</li>
                     <li>✓ Uma notificação de confirmação será enviada ao morador (com prioridade normal)</li>
                     <li>✓ A entrega será arquivada no histórico</li>
                   </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Entregas Recusadas
                </CardTitle>
                <CardDescription>Como registrar pacotes recusados ou avariados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-2">
                  Acesse <strong>Nova Recusa</strong> para registrar:
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  <li>✓ Pacotes com avaria ou danos</li>
                  <li>✓ Pacotes que o morador recusou receber</li>
                  <li>✓ Adicione fotos da avaria (até múltiplas)</li>
                  <li>✓ Descreva o motivo da recusa</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  As recusas aparecem na aba <strong>Recusas</strong> para controle.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: PALAVRAS-CHAVE */}
          <TabsContent value="keywords" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Sistema de Palavras-chave
                </CardTitle>
                <CardDescription>Forma rápida de registrar entregas esperadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">1️⃣ Morador Informa Palavra-chave</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      O morador acessa <strong>Registrar Palavra-chave</strong> e informa:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Uma palavra secreta/código único</li>
                      <li>✓ Quantos pacotes espera receber</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2 bg-blue-50 p-2 rounded">
                      💡 <strong>Exemplo:</strong> Morador espera 3 pacotes da Amazon. Informa palavra-chave "COMPRAS2026"
                    </p>
                  </div>

                  <div className="pt-2 border-t">
                    <h4 className="font-semibold text-sm mb-2">2️⃣ Funcionário Registra Entrega</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Na aba <strong>Palavras-chave</strong>, registre cada pacote:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Digite a palavra-chave "COMPRAS2026"</li>
                      <li>✓ Preencha dados do pacote (código, transportadora)</li>
                      <li>✓ Clique "Adicionar Entrega"</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Cada clique cria 1 ticket individual de entrega.
                    </p>
                  </div>

                  <div className="pt-2 border-t">
                    <h4 className="font-semibold text-sm mb-2">3️⃣ Acompanhar Progresso</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Na lista de palavras-chave, veja:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Quantos pacotes foram esperados vs. registrados</li>
                      <li>✓ Quantos já foram retirados</li>
                      <li>✓ Status geral da palavra-chave</li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      Benefícios da palavra-chave
                    </p>
                    <ul className="text-sm space-y-1 text-amber-700 ml-4">
                      <li>✓ Não precisa buscar o morador a cada pacote</li>
                      <li>✓ Mais rápido em recepciones com muitos pacotes</li>
                      <li>✓ Garante que todas as entregas sejam do morador correto</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: RELATÓRIOS */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Relatórios e Análises
                </CardTitle>
                <CardDescription>Gerar dados e estatísticas de entregas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">1️⃣ Filtrar por Período</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Na aba <strong>Relatórios</strong>, escolha:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ <strong>Dia</strong> - Entregas de hoje</li>
                      <li>✓ <strong>Mês</strong> - Todo o mês atual</li>
                      <li>✓ <strong>Ano</strong> - Todo o ano</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t">
                    <h4 className="font-semibold text-sm mb-2">2️⃣ Visualizar Dados</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Veja automaticamente:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Gráfico com volume de entregas</li>
                      <li>✓ Distribuição por transportadora</li>
                      <li>✓ Morador com mais entregas</li>
                      <li>✓ Tabela detalhada com todas as entregas</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t">
                    <h4 className="font-semibold text-sm mb-2">3️⃣ Exportar PDF</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Clique <strong>"Exportar PDF"</strong> para:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Baixar relatório completo formatado</li>
                      <li>✓ Compartilhar com administração</li>
                      <li>✓ Arquivar para auditoria</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: ADMIN */}
          <TabsContent value="admin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciamento de Funcionários
                </CardTitle>
                <CardDescription>Controlar usuários e permissões de acesso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">1️⃣ Criar Usuários</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Acesse <strong>Funcionários</strong> para adicionar:
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Nome completo</li>
                      <li>✓ Usuário (login)</li>
                      <li>✓ Senha (inicial)</li>
                      <li>✓ Role: <strong>Admin</strong> ou <strong>Funcionário</strong></li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t">
                    <h4 className="font-semibold text-sm mb-2">2️⃣ Permissões</h4>
                    <div className="space-y-2">
                      <div className="bg-purple-50 border border-purple-200 p-2 rounded">
                        <p className="text-xs font-semibold text-purple-800 mb-1">👤 ADMIN</p>
                        <p className="text-xs text-purple-700">Acesso total a tudo: aprovações, funcionários, configurações</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                        <p className="text-xs font-semibold text-blue-800 mb-1">🔧 FUNCIONÁRIO</p>
                        <p className="text-xs text-blue-700">Acesso limitado: registra entregas, visualiza relatórios</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 ml-4">
                      Customize permissões individuais para cada funcionário (adicionar morador, editar, deletar, etc)
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Fluxo de Aprovação
                </CardTitle>
                <CardDescription>Como revisar e aprovar novos moradores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg space-y-2">
                  <p className="text-sm text-emerald-900 font-semibold">✅ Passo a passo:</p>
                  <ol className="text-sm space-y-1 text-emerald-800 ml-4 list-decimal">
                    <li>Admin acessa <strong>Aprovações</strong></li>
                    <li>Revisa dados do morador (nome, telefone, apto)</li>
                    <li>Clica <strong>Aprovar</strong> se tudo está correto</li>
                    <li>Sistema cria automaticamente:<br/><span className="text-xs ml-2">- Bloco e apartamento (se novos)</span><br/><span className="text-xs ml-2">- Registro do morador</span></li>
                    <li>Morador pode começar a receber entregas</li>
                  </ol>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Dica:</strong> Rejeite se dados estão incompletos ou incorretos e peça ao morador para tentar novamente.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
        <CardHeader>
        <CardTitle className="text-lg">📧 Sistema de Notificações WhatsApp</CardTitle>
        <CardDescription>Como funciona o envio automático de mensagens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">🚀 Fila de Prioridade</h4>
            <p className="text-sm text-muted-foreground mb-2">
              As notificações são processadas em ordem de importância:
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground ml-4">
              <li>1️⃣ <span className="font-semibold text-red-600">ALTA (Novas Entregas)</span> - Enviadas primeiro</li>
              <li>2️⃣ <span className="font-semibold text-blue-600">NORMAL (Confirmações)</span> - Após as altas</li>
            </ul>
          </div>

          <div className="pt-2 border-t">
            <h4 className="font-semibold text-sm mb-2">⏱️ Agendamento Automático</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Para evitar spam:
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground ml-4">
              <li>✓ Máximo <strong>1 notificação a cada 5 minutos</strong> por número de telefone</li>
              <li>✓ Se houver fila, o sistema aguarda automaticamente</li>
              <li>✓ Você pode acompanhar no <strong>Monitor de Fila</strong> (aba WhatsApp)</li>
            </ul>
          </div>

          <div className="pt-2 border-t">
            <h4 className="font-semibold text-sm mb-2">✅ Status de Envio</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Cada notificação tem um status:
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground ml-4">
              <li>⏳ <strong>Pendente</strong> - Aguardando envio</li>
              <li>✅ <strong>Enviada</strong> - Notificação entregue</li>
              <li>❌ <strong>Falha</strong> - Erro na entrega (número sem WhatsApp, etc)</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-sm font-semibold text-blue-800 mb-1">💡 Configurações WhatsApp</p>
            <p className="text-sm text-blue-700">
              Configure as mensagens personalizadas na aba <strong>Configurações</strong> (área admin) para adaptar aos seus templates.
            </p>
          </div>
        </div>
        </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
        <CardTitle className="text-lg">🎯 Dicas Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>✨ Use <strong>busca rápida</strong> para encontrar entregas por código de rastreamento ou morador</p>
        <p>⌨️ Utilize o <strong>scanner de código de barras</strong> para registrar entregas mais rápido</p>
        <p>📱 O sistema é <strong>responsivo</strong> - funciona bem no celular também</p>
        <p>💾 Sempre há <strong>histórico completo</strong> - nada é perdido, apenas arquivado</p>
        <p>📊 Acompanhe métricas na aba <strong>Relatórios</strong> e <strong>Auditoria</strong></p>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}