import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import type { TaskTemplate } from '@/types/tasks';

const Tasks = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [templateForNew, setTemplateForNew] = useState<TaskTemplate | null>(null);

  const handleNewTask = () => {
    setEditTaskId(null);
    setTemplateForNew(null);
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
      <p className="page-subtitle">
        Alle konkrete opgaver – både ad hoc og opgaver oprettet fra årshjulet. Opret nye, tildel ansvarlige og følg status.
      </p>

      <div className="mt-6">
        <TaskList
          onOpenTask={handleOpen}
          onEditTask={handleEdit}
          onNewTask={handleNewTask}
          onNewFromTemplate={() => {
            // Navigate user to årshjul to pick a template
            window.location.href = '/aarshjul';
          }}
        />
      </div>

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
