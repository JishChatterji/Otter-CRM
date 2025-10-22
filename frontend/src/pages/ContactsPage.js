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
import { toast } from 'sonner';
import { Plus, Mail, Phone, Building, User, Sparkles, Trash2 } from 'lucide-react';

function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    status: 'lead',
    notes: ''
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await api.get('/contacts');
      setContacts(response.data);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contacts', formData);
      toast.success('Contact created successfully');
      setDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create contact');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      toast.success('Contact deleted successfully');
      fetchContacts();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const handleAIInsight = async (contact) => {
    setSelectedContact(contact);
    setAiDialogOpen(true);
    setAiLoading(true);
    setAiInsight('');
    try {
      const response = await api.post('/ai/contact-insights', { contact_id: contact.id });
      setAiInsight(response.data.content);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate insights');
      setAiInsight('Failed to generate insights. Please make sure your OpenAI API key is configured.');
    } finally {
      setAiLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      status: 'lead',
      notes: ''
    });
  };

  const statusColors = {
    lead: 'bg-blue-100 text-blue-800',
    prospect: 'bg-amber-100 text-amber-800',
    customer: 'bg-green-100 text-green-800'
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="contacts-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Contacts</h1>
            <p className="text-slate-600 mt-2">Manage your leads, prospects, and customers</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800" data-testid="add-contact-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-testid="add-contact-dialog">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>Create a new contact in your CRM</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      data-testid="contact-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="john@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="contact-email-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      data-testid="contact-phone-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger data-testid="contact-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      placeholder="Company Inc."
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      data-testid="contact-company-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input
                      placeholder="CEO"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      data-testid="contact-position-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes about this contact..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    data-testid="contact-notes-input"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="contact-submit-button">Create Contact</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="text-center py-12">
              <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No contacts yet</h3>
              <p className="text-slate-600 mb-4">Get started by adding your first contact</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact) => (
              <Card key={contact.id} className="border-slate-200 hover:shadow-lg transition-shadow" data-testid={`contact-card-${contact.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`contact-name-${contact.id}`}>{contact.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[contact.status]}`} data-testid={`contact-status-${contact.id}`}>
                          {contact.status}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      data-testid={`delete-contact-${contact.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate" data-testid={`contact-email-${contact.id}`}>{contact.email}</span>
                  </div>
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span data-testid={`contact-phone-${contact.id}`}>{contact.phone}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building className="w-4 h-4" />
                      <span data-testid={`contact-company-${contact.id}`}>{contact.company}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => handleAIInsight(contact)}
                    data-testid={`ai-insight-button-${contact.id}`}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Insights
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          <DialogContent className="max-w-3xl" data-testid="ai-insight-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Insights: {selectedContact?.name}
              </DialogTitle>
              <DialogDescription>GPT-4o powered contact analysis and recommendations</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {aiLoading ? (
                <div className="text-center py-8 text-slate-600">Analyzing contact data...</div>
              ) : (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 p-4 rounded-lg" data-testid="ai-insight-content">
                    {aiInsight}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

export default ContactsPage;