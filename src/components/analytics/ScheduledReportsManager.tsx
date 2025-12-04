// src/components/analytics/ScheduledReportsManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFirestore, useUser } from '@/firebase';
import { 
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  toggleReportStatus,
  getScheduleDescription,
  type ScheduledReport
} from '@/services/scheduled_reports_service';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Clock, Mail, Play, Pause, Trash2, Plus, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

const REPORT_FIELDS: Record<ScheduledReport['reportType'], Array<{ id: string; label: string }>> = {
  sales: [
    { id: 'saleDate', label: 'Sale Date' },
    { id: 'salespersonName', label: 'Salesperson' },
    { id: 'customerName', label: 'Customer' },
    { id: 'totalAmount', label: 'Total Amount' },
    { id: 'paymentMethod', label: 'Payment Method' },
  ],
  inventory: [
    { id: 'name', label: 'Material Name' },
    { id: 'category', label: 'Category' },
    { id: 'quantity', label: 'Quantity' },
    { id: 'unitCost', label: 'Unit Cost' },
    { id: 'reorderPoint', label: 'Reorder Point' },
  ],
  production: [
    { id: 'batchNumber', label: 'Batch Number' },
    { id: 'productName', label: 'Product' },
    { id: 'quantityProduced', label: 'Quantity' },
    { id: 'status', label: 'Status' },
    { id: 'supervisorName', label: 'Supervisor' },
  ],
  operations: [
    { id: 'materialId', label: 'Raw Material' },
    { id: 'vendorId', label: 'Supplier' },
    { id: 'quantity', label: 'Quantity' },
    { id: 'status', label: 'Status' },
    { id: 'requestedByName', label: 'Requested By' },
  ],
  activity: [
    { id: 'module', label: 'Module' },
    { id: 'action', label: 'Action' },
    { id: 'userName', label: 'User' },
    { id: 'timestamp', label: 'Timestamp' },
  ],
};

export function ScheduledReportsManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState<ScheduledReport['reportType']>('sales');
  const [schedule, setSchedule] = useState<ScheduledReport['schedule']>('weekly');
  const [recipients, setRecipients] = useState('');
  const [exportFormat, setExportFormat] = useState<ScheduledReport['exportFormat']>('excel');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [includeDateRange, setIncludeDateRange] = useState(true);

  // Fetch scheduled reports
  const reportsRef = useMemoFirebase(() => collection(firestore, 'scheduled_reports'), [firestore]);
  const { data: reports, isLoading } = useCollection<ScheduledReport>(reportsRef);

  const availableFields = REPORT_FIELDS[reportType];

  const resetForm = () => {
    setName('');
    setDescription('');
    setReportType('sales');
    setSchedule('weekly');
    setRecipients('');
    setExportFormat('excel');
    setSelectedFields(new Set());
    setIncludeDateRange(true);
  };

  const handleCreateReport = async () => {
    if (!user || !name || selectedFields.size === 0) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate email addresses
    const emailList = recipients.split(',').map(e => e.trim()).filter(e => e);
    if (emailList.length === 0) {
      alert('Please enter at least one recipient email');
      return;
    }

    try {
      await createScheduledReport(firestore, {
        name,
        description,
        reportType,
        schedule,
        recipients: emailList,
        fields: Array.from(selectedFields),
        exportFormat,
        isActive: true,
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Unknown',
        includeDateRange,
      });

      resetForm();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Failed to create scheduled report');
    }
  };

  const handleToggleStatus = async (reportId: string, currentStatus: boolean) => {
    try {
      await toggleReportStatus(firestore, reportId, !currentStatus);
    } catch (error) {
      console.error('Error toggling report status:', error);
      alert('Failed to update report status');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    setIsDeleting(reportId);
    try {
      await deleteScheduledReport(firestore, reportId);
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scheduled Reports</h3>
          <p className="text-sm text-muted-foreground">
            Automate report generation and email delivery
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Scheduled Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Scheduled Report</DialogTitle>
              <DialogDescription>
                Set up a report to be automatically generated and emailed on a schedule
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Report Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Report Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Weekly Sales Summary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this report"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Report Type & Schedule */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reportType">Report Type *</Label>
                  <Select value={reportType} onValueChange={(value) => {
                    setReportType(value as ScheduledReport['reportType']);
                    setSelectedFields(new Set());
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Report</SelectItem>
                      <SelectItem value="inventory">Inventory Report</SelectItem>
                      <SelectItem value="production">Production Report</SelectItem>
                      <SelectItem value="operations">Operations Report</SelectItem>
                      <SelectItem value="activity">Activity Log</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule *</Label>
                  <Select value={schedule} onValueChange={(value) => setSchedule(value as ScheduledReport['schedule'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {getScheduleDescription(schedule)}
                  </p>
                </div>
              </div>

              {/* Recipients */}
              <div className="space-y-2">
                <Label htmlFor="recipients">Recipients (Email Addresses) *</Label>
                <Input
                  id="recipients"
                  placeholder="email1@example.com, email2@example.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple emails with commas
                </p>
              </div>

              {/* Export Format */}
              <div className="space-y-2">
                <Label htmlFor="format">Export Format *</Label>
                <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ScheduledReport['exportFormat'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fields Selection */}
              <div className="space-y-2">
                <Label>Select Fields *</Label>
                <div className="grid gap-2 md:grid-cols-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {availableFields.map(field => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`field-${field.id}`}
                        checked={selectedFields.has(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <Label htmlFor={`field-${field.id}`} className="text-sm font-normal cursor-pointer">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedFields.size} field{selectedFields.size !== 1 ? 's' : ''} selected
                </p>
              </div>

              {/* Date Range Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDateRange"
                  checked={includeDateRange}
                  onCheckedChange={(checked) => setIncludeDateRange(checked as boolean)}
                />
                <Label htmlFor="includeDateRange" className="text-sm font-normal cursor-pointer">
                  Include data from the selected time period only
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReport} disabled={!name || selectedFields.size === 0}>
                Create Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Schedules</CardTitle>
          <CardDescription>
            Manage your automated report schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !reports || reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scheduled reports yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        {report.description && (
                          <div className="text-sm text-muted-foreground">{report.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.reportType}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {report.schedule}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {report.nextRun ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(report.nextRun.toDate(), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.isActive ? 'default' : 'secondary'}>
                        {report.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(report.id, report.isActive)}
                        >
                          {report.isActive ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={isDeleting === report.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
