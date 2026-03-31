import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TemplateList from './components/TemplateList';
import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import StyleGenerator from './components/StyleGenerator';

function App() {
  return (
    <Router>
      <div className="container">
        <header className="header">
          <h1>课表模板编辑系统</h1>
          <nav>
            <Link to="/">模板列表</Link>
            <Link to="/manager">模板管理</Link>
            <Link to="/style-generator">风格生成器</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<TemplateList />} />
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
