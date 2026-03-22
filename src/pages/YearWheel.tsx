import { useState, useMemo } from 'react';
import { formatDate } from '@/lib/utils';
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
  getCurrentSeasonLabel, getPreviousSeasonLabel, getSeasonOptions, monthToSeasonDate,
  isActiveStatus, TASK_STATUS_LABELS,
  type TaskTemplate, type Task,
} from '@/types/tasks';
import { Plus, ExternalLink, Loader2, Settings, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

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
  const [warningOpen, setWarningOpen] = useState(false);

  const activeTemplates = useMemo(() => templates.filter(t => t.is_active), [templates]);

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

  // Previous season unfinished yearwheel tasks
  const previousSeason = getPreviousSeasonLabel(season);
  const unfinishedPrevious = useMemo(() => {
    return tasks.filter(
      t => t.task_type === 'yearwheel' && t.season_label === previousSeason && isActiveStatus(t.status)
    );
  }, [tasks, previousSeason]);

  const unfinishedByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of unfinishedPrevious) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [unfinishedPrevious]);

  const handleCreateSingle = (template: TaskTemplate) => {
    setTemplateForNew(template);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setTemplateForNew(null);
  };

  const handleBulkCreateClick = () => {
    if (missingTemplates.length === 0) {
      toast.info('Alle årshjulsopgaver er allerede oprettet for denne sæson.');
      return;
    }
    // Check for unfinished previous season tasks
    if (unfinishedPrevious.length > 0) {
      setWarningOpen(true);
      return;
    }
    executeBulkCreate();
  };

  const executeBulkCreate = async () => {
    setWarningOpen(false);
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

  const handleViewUnfinished = () => {
    setWarningOpen(false);
    navigate(`/opgaver?season=${encodeURIComponent(previousSeason)}&type=yearwheel&status=active`);
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
              onClick={handleBulkCreateClick}
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
                            <Button variant="ghost" size="sm" onClick={() => navigate('/opgaver')}>
                              <ExternalLink className="mr-1 h-4 w-4" /> Åbn
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleCreateSingle(tpl)}>
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

      {/* Warning dialog for unfinished previous season tasks */}
      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Uafsluttede opgaver fra {previousSeason}
            </DialogTitle>
            <DialogDescription className="pt-2">
              Der findes stadig <strong>{unfinishedPrevious.length}</strong> åbne årshjulsopgave{unfinishedPrevious.length !== 1 ? 'r' : ''} fra
              forrige sæson ({previousSeason}).
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-border bg-muted/50 p-3 space-y-1">
            {Object.entries(unfinishedByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span>{TASK_STATUS_LABELS[status as Task['status']] || status}</span>
                <Badge variant="secondary" className="text-xs">{count}</Badge>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            Du kan stadig oprette opgaver for den nye sæson, men du bør overveje at afslutte eller annullere de gamle først.
          </p>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setWarningOpen(false)}>
              Annullér
            </Button>
            <Button variant="outline" onClick={handleViewUnfinished}>
              Se uafsluttede opgaver
            </Button>
            <Button onClick={executeBulkCreate}>
              Fortsæt og opret opgaver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default YearWheel;
