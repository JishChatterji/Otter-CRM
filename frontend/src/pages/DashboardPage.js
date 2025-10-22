import { useState, useEffect, useContext } from 'react';
import { AuthContext, api } from '@/App';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, CheckSquare, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

function DashboardPage() {
  const { user } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Loading analytics...</div>
        </div>
      </Layout>
    );
  }

  const stats = [
    {
      title: 'Total Contacts',
      value: analytics?.total_contacts || 0,
      icon: Users,
      color: 'bg-blue-500',
      testId: 'stat-contacts'
    },
    {
      title: 'Total Deals',
      value: analytics?.total_deals || 0,
      icon: DollarSign,
      color: 'bg-green-500',
      testId: 'stat-deals'
    },
    {
      title: 'Active Tasks',
      value: analytics?.total_tasks || 0,
      icon: CheckSquare,
      color: 'bg-amber-500',
      testId: 'stat-tasks'
    },
    {
      title: 'Pipeline Value',
      value: `$${analytics?.total_pipeline_value?.toLocaleString() || 0}`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      testId: 'stat-pipeline'
    }
  ];

  return (
    <Layout>
      <div className="space-y-8" data-testid="dashboard-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Welcome back, {user?.full_name}
          </h1>
          <p className="text-slate-600 mt-2">Here's what's happening with your business today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="border-slate-200 hover:shadow-lg transition-shadow" data-testid={stat.testId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900" data-testid={`${stat.testId}-value`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200" data-testid="deals-by-stage-card">
            <CardHeader>
              <CardTitle>Deals by Stage</CardTitle>
              <CardDescription>Distribution of deals across pipeline stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.deals_by_stage && Object.entries(analytics.deals_by_stage).map(([stage, data]) => (
                  <div key={stage} className="flex items-center justify-between" data-testid={`deal-stage-${stage}`}>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 capitalize">{stage}</span>
                        <span className="text-sm text-slate-600">{data.count} deals</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-slate-900 h-2 rounded-full"
                          style={{ width: `${analytics.total_deals > 0 ? (data.count / analytics.total_deals) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-sm font-semibold text-slate-900" data-testid={`deal-stage-${stage}-value`}>
                      ${data.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200" data-testid="contacts-by-status-card">
            <CardHeader>
              <CardTitle>Contact Status</CardTitle>
              <CardDescription>Distribution of contacts by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.contacts_by_status && Object.entries(analytics.contacts_by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between" data-testid={`contact-status-${status}`}>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 capitalize">{status}</span>
                        <span className="text-sm text-slate-600" data-testid={`contact-status-${status}-count`}>{count} contacts</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${analytics.total_contacts > 0 ? (count / analytics.total_contacts) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default DashboardPage;