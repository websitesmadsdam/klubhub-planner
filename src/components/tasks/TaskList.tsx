import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, FileText, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskStatusBadge } from './TaskStatusBadge';
import { useTasks, useDeleteTask, useUpdateTask } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import {
  TASK_STATUS_LABELS, TASK_TYPE_LABELS, AREA_OPTIONS,
  STATUS_TRANSITIONS, isActiveStatus, getSeasonOptions,
  type Task,
} from '@/types/tasks';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskListProps {
  onOpenTask: (id: string) => void;
  onEditTask: (id: string) => void;
  onNewTask: () => void;
  onNewFromTemplate: () => void;
}

export function TaskList({ onOpenTask, onEditTask, onNewTask, onNewFromTemplate }: TaskListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: profiles = [] } = useProfiles();
  const { user } = useAuth();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<string>('all');

  // Initialize filters from URL params (once)
  useEffect(() => {
    const urlSeason = searchParams.get('season');
    const urlType = searchParams.get('type');
    const urlStatus = searchParams.get('status');
    if (urlSeason) setSeasonFilter(urlSeason);
    if (urlType) setTypeFilter(urlType);
    if (urlStatus) setStatusFilter(urlStatus);
    // Clear URL params after reading
    if (urlSeason || urlType || urlStatus) {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === 'active' && !isActiveStatus(t.status)) return false;
      if (statusFilter === 'closed' && isActiveStatus(t.status)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'active' && statusFilter !== 'closed' && t.status !== statusFilter) return false;
      if (areaFilter !== 'all' && t.area !== areaFilter) return false;
      if (typeFilter !== 'all' && t.task_type !== typeFilter) return false;
      if (responsibleFilter !== 'all' && t.responsible_user_id !== responsibleFilter) return false;
      if (seasonFilter !== 'all' && t.season_label !== seasonFilter) return false;
      if (onlyMine && t.responsible_user_id !== user?.id) return false;
      return true;
    });
  }, [tasks, search, statusFilter, areaFilter, typeFilter, responsibleFilter, onlyMine, seasonFilter, user]);

  const handleStatusChange = (task: Task, newStatus: Task['status']) => {
    updateTask.mutate({
      id: task.id,
      status: newStatus,
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : { completed_at: null }),
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const displayName = (t: Task) =>
    t.responsible?.full_name || t.responsible?.email || '—';

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onNewTask}>
          <Plus className="mr-1 h-4 w-4" /> Ny opgave
        </Button>
        <Button variant="outline" onClick={onNewFromTemplate}>
          <FileText className="mr-1 h-4 w-4" /> Fra skabelon
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søg opgaver…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktive opgaver</SelectItem>
            <SelectItem value="closed">Lukkede opgaver</SelectItem>
            <SelectItem value="all">Alle statuser</SelectItem>
            {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Ansvarsområde" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle områder</SelectItem>
            {AREA_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle typer</SelectItem>
            {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ansvarlig" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || 'Ukendt'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sæson" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle sæsoner</SelectItem>
            {getSeasonOptions().map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
          <Checkbox checked={onlyMine} onCheckedChange={v => setOnlyMine(!!v)} />
          Mine opgaver
        </label>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Indlæser…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          {tasks.length === 0 ? 'Ingen opgaver endnu' : 'Ingen opgaver matcher filtrene'}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Område</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Ansvarlig</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(task => (
                <TableRow
                  key={task.id}
                  className={`cursor-pointer ${!isActiveStatus(task.status) ? 'opacity-60' : ''}`}
                  onClick={() => onOpenTask(task.id)}
                >
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell className="text-muted-foreground">{task.area || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{TASK_TYPE_LABELS[task.task_type] || task.task_type}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger onClick={e => e.stopPropagation()}>
                        <TaskStatusBadge status={task.status} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <div className="px-2 py-1 text-xs text-muted-foreground">Skift til:</div>
                        {STATUS_TRANSITIONS[task.status].map(s => (
                          <DropdownMenuItem
                            key={s}
                            onClick={e => { e.stopPropagation(); handleStatusChange(task, s); }}
                          >
                            {TASK_STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(task.deadline)}</TableCell>
                  <TableCell className="text-muted-foreground">{displayName(task)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditTask(task.id)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Slet opgave</AlertDialogTitle>
                            <AlertDialogDescription>
                              Er du sikker på, at du vil slette "{task.title}"?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuller</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTask.mutate(task.id)}>
                              Slet
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
