import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskTemplates } from '@/components/tasks/TaskTemplates';
import { useTaskTemplates } from '@/hooks/useTaskTemplates';
import { useTasks, useCreateTask } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import {
  getCurrentSeasonLabel, getSeasonOptions, monthToSeasonDate,
  type TaskTemplate,
} from '@/types/tasks';
import { Plus, ExternalLink, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MONTHS = [
  'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'December',
];

const YearWheel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: templates = [], isLoading: loadingTemplates } = useTaskTemplates();
  const { data: tasks = [], isLoading: loadingTasks } = useTasks();
  const createTask = useCreateTask();

  const [season, setSeason] = useState(getCurrentSeasonLabel);
  const [formOpen, setFormOpen] = useState(false);
  const [templateForNew, setTemplateForNew] = useState<TaskTemplate | null>(null);
  const [bulkCreating, setBulkCreating] = useState(false);

  const activeTemplates = useMemo(() => templates.filter(t => t.is_active), [templates]);

  // Map template_id → task for selected season
  const taskByTemplate = useMemo(() => {
    const map = new Map<string, typeof tasks[number]>();
    for (const t of tasks) {
      if (t.template_id && t.season_label === season) {
        map.set(t.template_id, t);
      }
    }
    return map;
  }, [tasks, season]);

  const missingTemplates = useMemo(
    () => activeTemplates.filter(t => !taskByTemplate.has(t.id)),
    [activeTemplates, taskByTemplate]
  );

  const handleCreateSingle = (template: TaskTemplate) => {
    setTemplateForNew(template);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setTemplateForNew(null);
  };

  const handleBulkCreate = async () => {
    if (missingTemplates.length === 0) {
      toast.info('Alle årshjulsopgaver er allerede oprettet for denne sæson.');
      return;
    }
    setBulkCreating(true);
    let created = 0;
    for (const tpl of missingTemplates) {
      try {
        await createTask.mutateAsync({
          title: tpl.title,
          description: tpl.description || null,
          area: tpl.area || null,
          task_type: 'yearwheel',
          status: 'not_started',
          template_id: tpl.id,
          season_label: season,
          period_start: tpl.default_period_start_month ? monthToSeasonDate(tpl.default_period_start_month, season) : null,
          period_end: tpl.default_period_end_month ? monthToSeasonDate(tpl.default_period_end_month, season) : null,
          created_by: user?.id || null,
        });
        created++;
      } catch {
        // individual error handled by mutation
      }
    }
    setBulkCreating(false);
    if (created > 0) {
      toast.success(`${created} årshjulsopgave${created > 1 ? 'r' : ''} oprettet for ${season}.`);
    }
  };

  const formatPeriod = (t: TaskTemplate) => {
    if (!t.default_period_start_month) return '—';
    const start = MONTHS[t.default_period_start_month - 1];
    const end = t.default_period_end_month ? MONTHS[t.default_period_end_month - 1] : null;
    return end ? `${start} – ${end}` : start;
  };

  const isLoading = loadingTemplates || loadingTasks;

  return (
    <div>
      <h1 className="page-header">Årshjul</h1>
      <p className="page-subtitle">
        Tilbagevendende klubopgaver og skabeloner. Vælg en sæson og se status for hver skabelon.
        Opgaver oprettet herfra vises automatisk under Opgaver.
      </p>

      <Tabs defaultValue="season" className="mt-6">
        <TabsList>
          <TabsTrigger value="season">Sæsonoversigt</TabsTrigger>
          <TabsTrigger value="templates"><Settings className="mr-1 h-4 w-4" /> Administrér skabeloner</TabsTrigger>
        </TabsList>

        <TabsContent value="season" className="space-y-4 mt-4">
          {/* Season selector + bulk action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Sæson:</span>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getSeasonOptions().map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={handleBulkCreate}
              disabled={bulkCreating || missingTemplates.length === 0}
            >
              {bulkCreating ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Opretter…</>
              ) : (
                <><Plus className="mr-1 h-4 w-4" /> Opret alle for {season} ({missingTemplates.length})</>
              )}
            </Button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Indlæser…</div>
          ) : activeTemplates.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
              Ingen aktive skabeloner. Gå til "Administrér skabeloner" for at oprette.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Ansvarsområde</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status ({season})</TableHead>
                    <TableHead>Ansvarlig</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTemplates.map(tpl => {
                    const task = taskByTemplate.get(tpl.id);
                    return (
                      <TableRow key={tpl.id}>
                        <TableCell className="font-medium">{tpl.title}</TableCell>
                        <TableCell className="text-muted-foreground">{tpl.area || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{formatPeriod(tpl)}</TableCell>
                        <TableCell>
                          {task ? (
                            <TaskStatusBadge status={task.status} />
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Ikke oprettet
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {task?.responsible?.full_name || task?.responsible?.email || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {task?.deadline
                            ? new Date(task.deadline).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {task ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate('/opgaver')}
                            >
                              <ExternalLink className="mr-1 h-4 w-4" /> Åbn
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCreateSingle(tpl)}
                            >
                              <Plus className="mr-1 h-4 w-4" /> Opret
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TaskTemplates onCreateFromTemplate={handleCreateSingle} />
        </TabsContent>
      </Tabs>

      <TaskForm
        open={formOpen}
        onClose={handleFormClose}
        template={templateForNew}
        seasonLabel={season}
      />
    </div>
  );
};

export default YearWheel;
