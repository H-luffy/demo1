import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TemplateList from './components/TemplateList';
import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import TemplateBrowser from './components/TemplateBrowser';
import AdminModeToggle from './components/AdminModeToggle';

function App() {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('isAdmin') === 'true';
  });

  const handleAdminStatusChange = (status) => {
    setIsAdmin(status);
  };

  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>课表模板编辑系统</h1>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link to="/">模板列表</Link>
              {isAdmin && <Link to="/manager">管理</Link>}
              <AdminModeToggle isAdmin={isAdmin} onAdminStateChange={handleAdminStatusChange} />
            </nav>
          </div>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<TemplateList isAdmin={isAdmin} />} />
            <Route path="/browser" element={<TemplateBrowser isAdmin={isAdmin} />} />
            <Route path="/manager" element={isAdmin ? <TemplateManager isAdmin={isAdmin} /> : <AccessDenied />} />
            <Route path="/editor/:id" element={<TemplateEditor />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// 访问拒绝页面组件
function AccessDenied() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      color: '#6b7280'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
      <h2 style={{ color: '#374151', marginBottom: '10px' }}>需要管理员权限</h2>
      <p>请点击右上角的"管理模式"按钮，输入管理员密码后访问</p>
    </div>
  );
}

export default App;
