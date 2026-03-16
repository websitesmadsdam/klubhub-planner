import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskTemplates } from '@/components/tasks/TaskTemplates';
import { TaskForm } from '@/components/tasks/TaskForm';
import type { TaskTemplate } from '@/types/tasks';

const YearWheel = () => {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [templateForNew, setTemplateForNew] = useState<TaskTemplate | null>(null);

  const handleCreateFromTemplate = (t: TaskTemplate) => {
    setTemplateForNew(t);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setTemplateForNew(null);
    // After creating a task from template, navigate to tasks
    navigate('/opgaver');
  };

  return (
    <div>
      <h1 className="page-header">Årshjul</h1>
      <p className="page-subtitle">
        Tilbagevendende klubopgaver og skabeloner. Opret en konkret opgave fra en skabelon – den dukker derefter op under Opgaver.
      </p>

      <div className="mt-6">
        <TaskTemplates onCreateFromTemplate={handleCreateFromTemplate} />
      </div>

      <TaskForm
        open={formOpen}
        onClose={handleFormClose}
        template={templateForNew}
      />
    </div>
  );
};

export default YearWheel;
