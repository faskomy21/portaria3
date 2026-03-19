import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportFilters from '@/components/reports/ReportFilters';
import DeliveriesTab from '@/components/reports/DeliveriesTab';
import RefusedTab from '@/components/reports/RefusedTab';
import KeywordsTab from '@/components/reports/KeywordsTab';
import NotificationsTab from '@/components/reports/NotificationsTab';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import ResetDataModal from '@/components/shared/ResetDataModal';
import PasswordProtectedResetModal from '@/components/shared/PasswordProtectedResetModal';
import { getSession } from '@/components/auth/AuthEmployee';

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

export default function Reports() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [reportType, setReportType] = useState('month');
  const [activeTab, setActiveTab] = useState('deliveries');
  const [showReset, setShowReset] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const session = getSession();
  const isAdmin = session?.role === 'admin';
  const canAccess = ['admin', 'gerente'].includes(session?.role);

  useEffect(() => {
    if (!canAccess) {
      window.location.href = '/Dashboard';
    }
  }, []);

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list('-created_date', 9999),
  });
  const { data: refusedDeliveries = [] } = useQuery({
    queryKey: ['refused_deliveries'],
    queryFn: () => base44.entities.RefusedDelivery.list('-created_date', 9999),
  });
  const { data: keywords = [] } = useQuery({
    queryKey: ['delivery_keywords'],
    queryFn: () => base44.entities.DeliveryKeyword.list('-created_date', 9999),
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ['notification_queue'],
    queryFn: () => base44.entities.NotificationQueue.list('-created_date', 9999),
  });

  const filterData = (data) => data.filter(d => {
    const date = new Date(d.created_date);
    const yearMatch = date.getFullYear() === selectedYear;
    if (reportType === 'day') return yearMatch && date.getMonth() === selectedMonth && date.getDate() === selectedDay;
    if (reportType === 'month') return yearMatch && date.getMonth() === selectedMonth;
    return yearMatch;
  });

  const filteredDeliveries = useMemo(() => filterData(deliveries), [deliveries, selectedMonth, selectedDay, selectedYear, reportType]);
  const filteredRefused = useMemo(() => filterData(refusedDeliveries), [refusedDeliveries, selectedMonth, selectedDay, selectedYear, reportType]);
  const filteredKeywords = useMemo(() => filterData(keywords), [keywords, selectedMonth, selectedDay, selectedYear, reportType]);
  const filteredNotifications = useMemo(() => filterData(notifications), [notifications, selectedMonth, selectedDay, selectedYear, reportType]);

  const getReportTitle = () => {
    if (reportType === 'day') return `${String(selectedDay).padStart(2,'0')} de ${MONTHS[selectedMonth]} de ${selectedYear}`;
    if (reportType === 'month') return `${MONTHS[selectedMonth]} de ${selectedYear}`;
    return `Ano ${selectedYear}`;
  };

  function downloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const addTitle = (text) => { doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(30,30,30); doc.text(text,14,y); y+=8; };
    const addSection = (title) => {
      if (y>260) { doc.addPage(); y=20; }
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(60,80,180);
      doc.text(title,14,y); y+=6;
      doc.setDrawColor(200,200,200); doc.line(14,y,pageWidth-14,y); y+=5;
    };
    const addRow = (label, value) => {
      if (y>270) { doc.addPage(); y=20; }
      doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50);
      doc.text(label,14,y); doc.setFont('helvetica','bold'); doc.setTextColor(30,30,30);
      doc.text(String(value), pageWidth-14, y, { align: 'right' }); y+=7;
    };

    addTitle(`Relatório — ${getReportTitle()}`);
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(120,120,120);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, y); y+=12;

    if (activeTab === 'deliveries' || activeTab === 'all') {
      addSection('Entregas');
      addRow('Total', filteredDeliveries.length);
      addRow('Retiradas', filteredDeliveries.filter(d=>d.status==='collected').length);
      addRow('Pendentes', filteredDeliveries.filter(d=>d.status!=='collected').length);
      y+=4;
      filteredDeliveries.forEach(d => {
        addRow(`${d.resident_name || '—'} (Apt ${d.apartment_number || '?'})`, d.tracking_code || '—');
      });
    }

    if (activeTab === 'refused' || activeTab === 'all') {
      addSection('Recusadas/Avarias');
      filteredRefused.forEach(d => {
        addRow(`${d.resident_name || '—'} — ${d.reason || 'sem motivo'}`, d.tracking_code || '—');
      });
    }

    if (activeTab === 'keywords' || activeTab === 'all') {
      addSection('Palavras-chave');
      filteredKeywords.forEach(d => {
        addRow(`${d.resident_name || '—'} (${d.apartment_number || '?'})`, d.keyword || '—');
      });
    }

    if (activeTab === 'notifications' || activeTab === 'all') {
      addSection('Notificações WhatsApp');
      addRow('Total', filteredNotifications.length);
      addRow('Enviadas', filteredNotifications.filter(n=>n.status==='sent').length);
      addRow('Falhas', filteredNotifications.filter(n=>n.status==='failed').length);
      addRow('Pendentes', filteredNotifications.filter(n=>n.status==='pending').length);
    }

    doc.save(`relatorio-${activeTab}-${getReportTitle().replace(/\s/g,'-').toLowerCase()}.pdf`);
  }



  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Análise detalhada por tipo de evento</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto flex-wrap">
          {isAdmin && (
           <Button onClick={() => setShowPasswordModal(true)} variant="destructive" size="sm" className="gap-2">
             <Trash2 className="h-4 w-4" /> Resetar Dados
           </Button>
          )}
          <PasswordProtectedResetModal 
           open={showPasswordModal} 
           onPasswordVerified={() => setShowReset(true)}
           onClose={() => setShowPasswordModal(false)}
          />
          <Button onClick={downloadPDF} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
        <ResetDataModal open={showReset} onClose={() => setShowReset(false)} />
      </div>

      <ReportFilters
        reportType={reportType} setReportType={setReportType}
        selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
        selectedDay={selectedDay} setSelectedDay={setSelectedDay}
        selectedYear={selectedYear} setSelectedYear={setSelectedYear}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="deliveries">Entregas</TabsTrigger>
          <TabsTrigger value="refused">Recusas/Avarias</TabsTrigger>
          <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="mt-4">
          <DeliveriesTab deliveries={filteredDeliveries} allDeliveries={deliveries} />
        </TabsContent>
        <TabsContent value="refused" className="mt-4">
          <RefusedTab refused={filteredRefused} />
        </TabsContent>
        <TabsContent value="keywords" className="mt-4">
          <KeywordsTab keywords={filteredKeywords} />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab notifications={filteredNotifications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}