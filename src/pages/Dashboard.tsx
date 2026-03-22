import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/hooks/useTasks';
import { useTaskTemplates } from '@/hooks/useTaskTemplates';
import { useAuth } from '@/hooks/useAuth';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TASK_STATUS_LABELS, isActiveStatus, type Task } from '@/types/tasks';
import { ListChecks, CalendarDays, AlertCircle, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tasks = [] } = useTasks();
  const { data: templates = [] } = useTaskTemplates();

  const activeTasks = tasks.filter(t => isActiveStatus(t.status));
  const myActiveTasks = activeTasks.filter(t => t.responsible_user_id === user?.id);
  const waitingTasks = activeTasks.filter(t => t.status === 'waiting');
  const activeTemplates = templates.filter(t => t.is_active);

  // Upcoming deadlines: active tasks with deadline, sorted by nearest
  const upcomingDeadlines = activeTasks
    .filter(t => t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5);

  const statusCounts = activeTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const fmtShort = (d: string) => formatDate(d);

  const isOverdue = (d: string) => new Date(d) < new Date(new Date().toDateString());

  return (
    <div>
      <h1 className="page-header">Dashboard</h1>
      <p className="page-subtitle">Overblik over klubbens aktiviteter</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {/* Active tasks summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktive opgaver</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeTasks.length}</div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(statusCounts).map(([status, count]) => (
                <span key={status} className="text-xs text-muted-foreground">
                  {TASK_STATUS_LABELS[status as Task['status']]}: {count}
                </span>
              ))}
            </div>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs" onClick={() => navigate('/opgaver')}>
              Se alle opgaver <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* My active tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mine aktive opgaver</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{myActiveTasks.length}</div>
            {myActiveTasks.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {myActiveTasks.slice(0, 3).map(t => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <TaskStatusBadge status={t.status} />
                    <span className="truncate">{t.title}</span>
                  </li>
                ))}
                {myActiveTasks.length > 3 && (
                  <li className="text-xs text-muted-foreground">+{myActiveTasks.length - 3} mere</li>
                )}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Ingen aktive opgaver tildelt dig</p>
            )}
          </CardContent>
        </Card>

        {/* Waiting + Årshjul */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Afventer handling</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{waitingTasks.length}</div>
            <p className="text-sm text-muted-foreground mt-1">opgaver afventer</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{activeTemplates.length} aktive skabeloner</span>
            </div>
            <Button variant="link" className="mt-1 h-auto p-0 text-xs" onClick={() => navigate('/aarshjul')}>
              Gå til årshjul <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Kommende deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingDeadlines.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate('/opgaver')}
                >
                  <div className="flex items-center gap-3">
                    <TaskStatusBadge status={t.status} />
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.area || 'Ingen område'} · {t.responsible?.full_name || t.responsible?.email || 'Ikke tildelt'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${isOverdue(t.deadline!) ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {isOverdue(t.deadline!) ? 'Overskredet · ' : ''}{fmtShort(t.deadline!)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
