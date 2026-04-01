import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TemplateList from './components/TemplateList';
import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import StyleGenerator from './components/StyleGenerator';
import TemplateBrowser from './components/TemplateBrowser';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>课表模板编辑系统</h1>
            <nav>
              <Link to="/">模板列表</Link>
              <Link to="/browser">浏览器</Link>
              <Link to="/manager">管理</Link>
              <Link to="/style-generator">风格生成</Link>
            </nav>
          </div>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<TemplateList />} />
            <Route path="/browser" element={<TemplateBrowser />} />
            <Route path="/manager" element={<TemplateManager />} />
            <Route path="/editor/:id" element={<TemplateEditor />} />
            <Route path="/style-generator" element={<StyleGenerator />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
