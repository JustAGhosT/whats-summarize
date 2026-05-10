import React from 'react';
import { Layout as AntdLayout, Menu, Typography, Avatar, Dropdown, Button } from 'antd';
import { 
  LogoutOutlined, 
  UserOutlined, 
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';

const { Header, Content, Sider } = AntdLayout;
const { Title } = Typography;

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        <Link href="/profile">Profile</Link>
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        <Link href="/settings">Settings</Link>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <AntdLayout className="app-layout">
      <Header className="app-header">
        <div className="header-left">
          {showSidebar && (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="sidebar-toggle"
            />
          )}
          <Link href="/" className="logo">
            <Title level={4} style={{ color: '#fff', margin: 0 }}>ConvoLens</Title>
          </Link>
        </div>
        
        <div className="header-right">
          {user ? (
            <Dropdown overlay={userMenu} trigger={['click']} placement="bottomRight">
              <div className="user-menu">
                <Avatar
                  icon={<UserOutlined />}
                  src={user.avatar}
                  style={{ marginRight: 8, backgroundColor: '#1890ff' }}
                />
                <span className="username">{user.name || user.email}</span>
              </div>
            </Dropdown>
          ) : (
            <div className="auth-buttons">
              <Button type="text" onClick={() => router.push('/login')}>
                Login
              </Button>
              <Button type="primary" onClick={() => router.push('/register')}>
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </Header>

      <AntdLayout>
        {showSidebar && (
          <Sider 
            width={250} 
            className="app-sider"
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            trigger={null}
            collapsedWidth={0}
          >
            <Menu
              mode="inline"
              defaultSelectedKeys={[router.pathname]}
              className="sidebar-menu"
              items={[
                {
                  key: '/dashboard',
                  icon: <i className="fas fa-home" />,
                  label: <Link href="/dashboard">Dashboard</Link>,
                },
                {
                  key: '/groups',
                  icon: <i className="fas fa-users" />,
                  label: <Link href="/groups">Groups</Link>,
                },
                {
                  key: '/analytics',
                  icon: <i className="fas fa-chart-bar" />,
                  label: <Link href="/analytics">Analytics</Link>,
                },
              ]}
            />
          </Sider>
        )}
        
        <Content className="app-content">
          {children}
        </Content>
      </AntdLayout>

      <style jsx global>{`
        .app-layout {
          min-height: 100vh;
        }
        
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          background: #001529;
          color: #fff;
          height: 64px;
          line-height: 64px;
        }
        
        .header-left {
          display: flex;
          align-items: center;
        }
        
        .header-right {
          display: flex;
          align-items: center;
        }
        
        .logo {
          color: #fff;
          font-weight: bold;
          font-size: 20px;
          margin-right: 24px;
        }
        
        .user-menu {
          display: flex;
          align-items: center;
          padding: 0 12px;
          cursor: pointer;
          transition: all 0.3s;
          height: 64px;
        }
        
        .user-menu:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .username {
          margin-left: 8px;
          color: #fff;
        }
        
        .auth-buttons {
          display: flex;
          gap: 12px;
        }
        
        .app-sider {
          background: #fff;
          border-right: 1px solid #f0f0f0;
          overflow: auto;
          height: calc(100vh - 64px);
          position: fixed;
          left: 0;
          top: 64px;
          bottom: 0;
          z-index: 10;
        }
        
        .app-content {
          margin: 24px 24px 24px ${showSidebar ? '274px' : '24px'};
          min-height: calc(100vh - 112px);
          transition: all 0.2s;
        }
        
        .sidebar-toggle {
          color: #fff;
          font-size: 16px;
          width: 48px;
          height: 48px;
          margin-right: 8px;
        }
        
        @media (max-width: 768px) {
          .app-sider {
            display: ${collapsed ? 'none' : 'block'};
            width: 100% !important;
            max-width: 100% !important;
            flex: 0 0 100% !important;
          }
          
          .app-content {
            margin-left: 24px !important;
          }
        }
      `}</style>
    </AntdLayout>
  );
};

export default Layout;
