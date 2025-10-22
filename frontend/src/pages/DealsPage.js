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
import { Plus, DollarSign, Calendar, TrendingUp, Sparkles, Trash2 } from 'lucide-react';

function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    contact_id: '',
    value: '',
    stage: 'qualification',
    probability: 25,
    expected_close_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchDeals();
    fetchContacts();
  }, []);

  const fetchDeals = async () => {
    try {
      const response = await api.get('/deals');
      setDeals(response.data);
    } catch (error) {
      toast.error('Failed to load deals');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/deals', formData);
      toast.success('Deal created successfully');
      setDialogOpen(false);
      resetForm();
      fetchDeals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create deal');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;
    try {
      await api.delete(`/deals/${id}`);
      toast.success('Deal deleted successfully');
      fetchDeals();
    } catch (error) {
      toast.error('Failed to delete deal');
    }
  };

  const handleAIAnalysis = async (deal) => {
    setSelectedDeal(deal);
    setAiDialogOpen(true);
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const response = await api.post('/ai/deal-analysis', { deal_id: deal.id });
      setAiAnalysis(response.data.content);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate analysis');
      setAiAnalysis('Failed to generate analysis. Please make sure your OpenAI API key is configured.');
    } finally {
      setAiLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      contact_id: '',
      value: '',
      stage: 'qualification',
      probability: 25,
      expected_close_date: '',
      notes: ''
    });
  };

  const stageColors = {
    qualification: 'bg-blue-500',
    proposal: 'bg-amber-500',
    negotiation: 'bg-purple-500',
    closed: 'bg-green-500'
  };

  const groupedDeals = {
    qualification: deals.filter(d => d.stage === 'qualification'),
    proposal: deals.filter(d => d.stage === 'proposal'),
    negotiation: deals.filter(d => d.stage === 'negotiation'),
    closed: deals.filter(d => d.stage === 'closed')
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="deals-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Deals Pipeline</h1>
            <p className="text-slate-600 mt-2">Track and manage your sales opportunities</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800" data-testid="add-deal-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-testid="add-deal-dialog">
              <DialogHeader>
                <DialogTitle>Add New Deal</DialogTitle>
                <DialogDescription>Create a new sales opportunity</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Deal Title *</Label>
                  <Input
                    placeholder="Enterprise Software License"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="deal-title-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact *</Label>
                    <Select value={formData.contact_id} onValueChange={(value) => setFormData({ ...formData, contact_id: value })} required>
                      <SelectTrigger data-testid="deal-contact-select">
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map(contact => (
                          <SelectItem key={contact.id} value={contact.id}>{contact.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Deal Value *</Label>
                    <Input
                      type="number"
                      placeholder="50000"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      required
                      data-testid="deal-value-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                      <SelectTrigger data-testid="deal-stage-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualification">Qualification</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Probability (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                      data-testid="deal-probability-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expected Close Date</Label>
                  <Input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    data-testid="deal-closedate-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes about this deal..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    data-testid="deal-notes-input"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="deal-submit-button">Create Deal</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading deals...</div>
        ) : deals.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="text-center py-12">
              <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No deals yet</h3>
              <p className="text-slate-600 mb-4">Create your first sales opportunity</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {Object.entries(groupedDeals).map(([stage, stageDeals]) => (
              <div key={stage} className="space-y-4" data-testid={`deals-stage-${stage}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stageColors[stage]}`} />
                  <h3 className="font-semibold text-slate-900 capitalize">{stage}</h3>
                  <span className="text-sm text-slate-600">({stageDeals.length})</span>
                </div>
                <div className="space-y-3">
                  {stageDeals.map((deal) => (
                    <Card key={deal.id} className="border-slate-200 hover:shadow-md transition-shadow" data-testid={`deal-card-${deal.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm" data-testid={`deal-title-${deal.id}`}>{deal.title}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(deal.id)}
                            data-testid={`delete-deal-${deal.id}`}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                        <CardDescription className="text-xs" data-testid={`deal-contact-${deal.id}`}>{deal.contact_name}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-slate-500" />
                          <span className="font-semibold text-slate-900" data-testid={`deal-value-${deal.id}`}>${deal.value.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <TrendingUp className="w-3 h-3" />
                          <span data-testid={`deal-probability-${deal.id}`}>{deal.probability}% probability</span>
                        </div>
                        {deal.expected_close_date && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Calendar className="w-3 h-3" />
                            <span data-testid={`deal-closedate-${deal.id}`}>{deal.expected_close_date}</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 text-xs h-8"
                          onClick={() => handleAIAnalysis(deal)}
                          data-testid={`ai-analysis-button-${deal.id}`}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Analysis
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          <DialogContent className="max-w-3xl" data-testid="ai-analysis-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Analysis: {selectedDeal?.title}
              </DialogTitle>
              <DialogDescription>GPT-4o powered deal analysis and closing recommendations</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {aiLoading ? (
                <div className="text-center py-8 text-slate-600">Analyzing deal data...</div>
              ) : (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 p-4 rounded-lg" data-testid="ai-analysis-content">
                    {aiAnalysis}
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

export default DealsPage;