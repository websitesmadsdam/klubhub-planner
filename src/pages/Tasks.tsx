import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { TaskTemplates } from '@/components/tasks/TaskTemplates';
import type { TaskTemplate } from '@/types/tasks';

const Tasks = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [templateForNew, setTemplateForNew] = useState<TaskTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('oversigt');

  const handleNewTask = () => {
    setEditTaskId(null);
    setTemplateForNew(null);
    setFormOpen(true);
  };

  const handleNewFromTemplate = () => {
    setActiveTab('skabeloner');
  };

  const handleCreateFromTemplate = (t: TaskTemplate) => {
    setEditTaskId(null);
    setTemplateForNew(t);
    setFormOpen(true);
  };

  const handleEdit = (id: string) => {
    setTemplateForNew(null);
    setEditTaskId(id);
    setFormOpen(true);
  };

  const handleOpen = (id: string) => {
    setDetailTaskId(id);
    setDetailOpen(true);
  };

  return (
    <div>
      <h1 className="page-header">Opgaver</h1>
      <p className="page-subtitle">Fordel og følg op på opgaver</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="oversigt">Oversigt</TabsTrigger>
          <TabsTrigger value="skabeloner">Årshjulsskabeloner</TabsTrigger>
        </TabsList>

        <TabsContent value="oversigt" className="mt-4">
          <TaskList
            onOpenTask={handleOpen}
            onEditTask={handleEdit}
            onNewTask={handleNewTask}
            onNewFromTemplate={handleNewFromTemplate}
          />
        </TabsContent>

        <TabsContent value="skabeloner" className="mt-4">
          <TaskTemplates onCreateFromTemplate={handleCreateFromTemplate} />
        </TabsContent>
      </Tabs>

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editTaskId={editTaskId}
        template={templateForNew}
      />

      <TaskDetail
        taskId={detailTaskId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
      />
    </div>
  );
};

export default Tasks;
