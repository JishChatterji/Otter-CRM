import { useContext } from 'react';
import { AuthContext } from '@/App';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, DollarSign, CheckSquare, LogOut, Building2 } from 'lucide-react';

function Layout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
    { name: 'Contacts', path: '/contacts', icon: Users, testId: 'nav-contacts' },
    { name: 'Deals', path: '/deals', icon: DollarSign, testId: 'nav-deals' },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare, testId: 'nav-tasks' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200" data-testid="top-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-slate-900 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>CRM System</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600" data-testid="user-info">
                <span className="font-medium text-slate-900">{user?.full_name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-button">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Side Navigation */}
      <div className="flex">
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4" data-testid="side-nav">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  data-testid={item.testId}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8" data-testid="main-content">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;