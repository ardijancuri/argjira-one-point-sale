import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Settings, 
  ShoppingBag, 
  Users, 
  Package, 
  BarChart3,
  Receipt,
  LogOut,
  Menu,
  X,
  Wrench,
  ChevronDown,
  ChevronRight,
  FileOutput,
  FileInput
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pos', icon: ShoppingCart, label: 'POS / Shitje' },
  { 
    id: 'faturat',
    icon: FileText, 
    label: 'Faturat',
    children: [
      { path: '/invoices/dalese', icon: FileOutput, label: 'Fatura Dalëse' },
      { path: '/invoices/hyrese', icon: FileInput, label: 'Fatura Hyrëse' },
      { path: '/invoices/processing', icon: Wrench, label: 'Përpunim i Arit' },
    ]
  },
  { path: '/purchase', icon: ShoppingBag, label: 'Blerje Ari' },
  { path: '/clients', icon: Users, label: 'Klientët' },
  { path: '/stock', icon: Package, label: 'Stoqet' },
  { path: '/reports', icon: BarChart3, label: 'Raportet', adminOnly: true },
  { path: '/settings', icon: Settings, label: 'Cilësimet', adminOnly: true },
];

export default function Sidebar({ isOpen, onClose, collapsed, setCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { open } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  // Check if mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-expand menu if current path is a child
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(child => location.pathname === child.path);
        if (isChildActive) {
          setExpandedMenus(prev => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [location.pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isOpen && isMobile) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin()) {
      return false;
    }
    return true;
  });

  const isMenuActive = (item) => {
    if (item.path) {
      return location.pathname === item.path;
    }
    if (item.children) {
      return item.children.some(child => location.pathname === child.path);
    }
    return false;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        bg-sidebar-bg text-white fixed h-screen overflow-y-auto transition-all duration-300 z-50 flex flex-col
        ${collapsed && !isMobile ? 'w-[70px]' : 'w-[260px]'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className={`border-b border-white/10 flex items-center ${collapsed && !isMobile ? 'justify-center p-3' : 'justify-between p-5'}`}>
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-2.5 transition-all duration-300">
              <Receipt className="text-primary text-2xl" />
              <h2 className="text-xl font-bold whitespace-nowrap">Invoice Pro</h2>
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Collapse/Expand button for desktop/laptop */}
            {!collapsed && (
              <button
                onClick={() => setCollapsed && setCollapsed(true)}
                className="hidden lg:flex w-8 h-8 items-center justify-center cursor-pointer hover:bg-white/10 rounded transition-colors"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {collapsed && (
              <button
                onClick={() => setCollapsed && setCollapsed(false)}
                className="hidden lg:flex w-8 h-8 items-center justify-center cursor-pointer hover:bg-white/10 rounded transition-colors"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-white/10 rounded transition-colors"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      
        <ul className="py-5 flex-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isMenuActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus[item.id];
            
            // Regular menu item (no children)
            if (!hasChildren) {
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 py-3 transition-all relative ${
                      collapsed && !isMobile ? 'justify-center px-2' : 'px-5'
                    } ${
                      isActive
                        ? collapsed && !isMobile
                          ? 'bg-primary text-white'
                          : 'bg-primary border-l-4 border-white text-white'
                        : 'text-white/80 hover:bg-sidebar-hover hover:text-white'
                    }`}
                    title={collapsed && !isMobile ? item.label : ''}
                  >
                    {collapsed && !isMobile && isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>
                    )}
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && (
                      <span className="whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            }
            
            // Menu item with children (dropdown)
            return (
              <li key={item.id}>
                {/* Parent item */}
                <button
                  onClick={() => {
                    if (collapsed && !isMobile) {
                      // When collapsed, expand sidebar first
                      setCollapsed && setCollapsed(false);
                      setExpandedMenus(prev => ({ ...prev, [item.id]: true }));
                    } else {
                      toggleMenu(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 py-3 transition-all relative ${
                    collapsed && !isMobile ? 'justify-center px-2' : 'px-5'
                  } ${
                    isActive
                      ? collapsed && !isMobile
                        ? 'bg-primary/50 text-white'
                        : 'bg-primary/50 border-l-4 border-white text-white'
                      : 'text-white/80 hover:bg-sidebar-hover hover:text-white'
                  }`}
                  title={collapsed && !isMobile ? item.label : ''}
                >
                  {collapsed && !isMobile && isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>
                  )}
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {(!collapsed || isMobile) && (
                    <>
                      <span className="whitespace-nowrap flex-1 text-left">
                        {item.label}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      )}
                    </>
                  )}
                </button>
                
                {/* Children items */}
                {(!collapsed || isMobile) && isExpanded && (
                  <ul className="bg-black/20">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = location.pathname === child.path;
                      
                      return (
                        <li key={child.path}>
                          <Link
                            to={child.path}
                            className={`flex items-center gap-3 py-2.5 pl-10 pr-5 transition-all relative ${
                              isChildActive
                                ? 'bg-primary text-white border-l-4 border-white'
                                : 'text-white/70 hover:bg-sidebar-hover hover:text-white'
                            }`}
                          >
                            {ChildIcon && <ChildIcon className="w-4 h-4 flex-shrink-0" />}
                            <span className="whitespace-nowrap text-sm">
                              {child.label}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className={`border-t border-white/10 ${collapsed && !isMobile ? 'p-2' : 'p-5'}`}>
          {user && (!collapsed || isMobile) && (
            <div className="mb-3 px-5 py-2 text-sm">
              <div className="font-semibold">{user.username}</div>
              <div className="text-white/60 text-xs">{user.role === 'admin' ? 'Admin' : 'Manager'}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full text-white/80 hover:bg-sidebar-hover hover:text-white transition-all rounded ${
              collapsed && !isMobile ? 'justify-center px-2 py-3' : 'px-5 py-3'
            }`}
            title={collapsed && !isMobile ? 'Dil' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || isMobile) && (
              <span className="whitespace-nowrap">Dil</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
