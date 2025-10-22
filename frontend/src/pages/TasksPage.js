import { useState, useEffect } from 'react';
import { api } from '@/App';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, CheckSquare, Calendar, AlertCircle, Trash2 } from 'lucide-react';

function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    related_to: '',
    related_type: '',
    due_date: '',
    priority: 'medium',
    status: 'pending'
  });

  useEffect(() => {
    fetchTasks();
    fetchContacts();
    fetchDeals();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await api.get('/contacts');
      setContacts(response.data);
    } catch (error) {
      console.error('Failed to load contacts');
    }
  };

  const fetchDeals = async () => {
    try {
      const response = await api.get('/deals');
      setDeals(response.data);
    } catch (error) {
      console.error('Failed to load deals');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', formData);
      toast.success('Task created successfully');
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create task');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted successfully');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleStatusChange = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.put(`/tasks/${task.id}`, { ...task, status: newStatus });
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      related_to: '',
      related_type: '',
      due_date: '',
      priority: 'medium',
      status: 'pending'
    });
  };

  const priorityColors = {
    low: 'text-blue-600 bg-blue-50',
    medium: 'text-amber-600 bg-amber-50',
    high: 'text-red-600 bg-red-50'
  };

  const statusColors = {
    pending: 'bg-slate-100 text-slate-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800'
  };

  const groupedTasks = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed')
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="tasks-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Tasks</h1>
            <p className="text-slate-600 mt-2">Manage your activities and to-dos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800" data-testid="add-task-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-testid="add-task-dialog">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>Create a new task or activity</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Task Title *</Label>
                  <Input
                    placeholder="Follow up with prospect"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="task-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Task details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    data-testid="task-description-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Related To</Label>
                    <Select value={formData.related_type} onValueChange={(value) => {
                      setFormData({ ...formData, related_type: value, related_to: '' });
                    }}>
                      <SelectTrigger data-testid="task-related-type-select">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contact">Contact</SelectItem>
                        <SelectItem value="deal">Deal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.related_type && (
                    <div className="space-y-2">
                      <Label>Select {formData.related_type}</Label>
                      <Select value={formData.related_to} onValueChange={(value) => setFormData({ ...formData, related_to: value })}>
                        <SelectTrigger data-testid="task-related-to-select">
                          <SelectValue placeholder={`Select ${formData.related_type}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.related_type === 'contact' ? (
                            contacts.map(contact => (
                              <SelectItem key={contact.id} value={contact.id}>{contact.name}</SelectItem>
                            ))
                          ) : (
                            deals.map(deal => (
                              <SelectItem key={deal.id} value={deal.id}>{deal.title}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger data-testid="task-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger data-testid="task-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      data-testid="task-duedate-input"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="task-submit-button">Create Task</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="text-center py-12">
              <CheckSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks yet</h3>
              <p className="text-slate-600 mb-4">Create your first task to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(groupedTasks).map(([status, statusTasks]) => (
              <div key={status} className="space-y-4" data-testid={`tasks-status-${status}`}>
                <h3 className="font-semibold text-slate-900 capitalize">{status.replace('_', ' ')} ({statusTasks.length})</h3>
                <div className="space-y-3">
                  {statusTasks.map((task) => (
                    <Card key={task.id} className="border-slate-200 hover:shadow-md transition-shadow" data-testid={`task-card-${task.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={() => handleStatusChange(task)}
                            className="mt-1"
                            data-testid={`task-checkbox-${task.id}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <CardTitle className={`text-sm ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`} data-testid={`task-title-${task.id}`}>
                                {task.title}
                              </CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(task.id)}
                                data-testid={`delete-task-${task.id}`}
                                className="h-6 w-6 p-0 -mt-1"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                            {task.description && (
                              <CardDescription className="text-xs mt-1" data-testid={`task-description-${task.id}`}>{task.description}</CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityColors[task.priority]}`} data-testid={`task-priority-${task.id}`}>
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            {task.priority}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[task.status]}`} data-testid={`task-status-${task.id}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Calendar className="w-3 h-3" />
                            <span data-testid={`task-duedate-${task.id}`}>Due: {task.due_date}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default TasksPage;