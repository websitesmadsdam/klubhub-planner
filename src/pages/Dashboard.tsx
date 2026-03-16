import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/hooks/useTasks';
import { useTaskTemplates } from '@/hooks/useTaskTemplates';
import { useAuth } from '@/hooks/useAuth';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TASK_STATUS_LABELS, type Task } from '@/types/tasks';
import { ListChecks, CalendarDays, Clock, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tasks = [] } = useTasks();
  const { data: templates = [] } = useTaskTemplates();

  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const myTasks = activeTasks.filter(t => t.responsible_user_id === user?.id);
  const activeTemplates = templates.filter(t => t.is_active);

  const statusCounts = activeTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="page-header">Dashboard</h1>
      <p className="page-subtitle">Overblik over klubbens aktiviteter</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {/* Task summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktive opgaver</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeTasks.length}</div>
            <div className="mt-2 flex flex-wrap gap-2">
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

        {/* My tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mine opgaver</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{myTasks.length}</div>
            {myTasks.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {myTasks.slice(0, 3).map(t => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <TaskStatusBadge status={t.status} />
                    <span className="truncate">{t.title}</span>
                  </li>
                ))}
                {myTasks.length > 3 && (
                  <li className="text-xs text-muted-foreground">+{myTasks.length - 3} mere</li>
                )}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Ingen opgaver tildelt dig</p>
            )}
          </CardContent>
        </Card>

        {/* Year wheel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Årshjul</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeTemplates.length}</div>
            <p className="text-sm text-muted-foreground mt-1">aktive skabeloner</p>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs" onClick={() => navigate('/aarshjul')}>
              Gå til årshjul <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent tasks */}
      {activeTasks.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Seneste opgaver</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeTasks.slice(0, 5).map(t => (
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
                  {t.deadline && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.deadline).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
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
