import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client';

const AdminModeToggle = ({ isAdmin, onAdminStateChange }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);

  // 模态框打开时自动聚焦输入框
  useEffect(() => {
    if (showPasswordModal && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [showPasswordModal]);

  // 处理密码输入
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    // 清除错误信息
    if (error) {
      setError(null);
    }
  };

  // 验证管理员密码
  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setError('请输入密码');
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('正在验证密码...');
      const response = await apiClient.post('/api/admin/verify', { password: password.trim() });
      console.log('服务器响应:', response.data);
      
      if (response.data.success) {
        console.log('验证成功，进入管理员模式');
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminPassword', password.trim()); // 保存密码用于后续API调用
        setShowPasswordModal(false);
        setPassword('');
        setShowPassword(false);
        if (onAdminStateChange) {
          onAdminStateChange(true);
        }
      } else {
        console.error('验证失败:', response.data.error);
        setError(response.data.error || '密码错误，请重试');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error('验证请求失败:', err);
      setError(err.response?.data?.error || '网络连接失败，请检查后端服务');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // 退出管理员模式
  const handleExitAdmin = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminPassword'); // 清除保存的密码
    if (onAdminStateChange) {
      onAdminStateChange(false);
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleVerifyPassword();
    }
  };

  // 关闭模态框并重置状态
  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setPassword('');
    setError(null);
    setShowPassword(false);
    localStorage.removeItem('adminPassword'); // 清除可能保存的密码
  };

  // 处理遮罩层点击
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      handleCloseModal();
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isAdmin ? (
          <>
            <span style={{ 
              color: '#10b981', 
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              🔐 管理员模式
            </span>
            <button
              onClick={handleExitAdmin}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#dc2626';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ef4444';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
              }}
            >
              退出管理
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowPasswordModal(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#2563eb';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#3b82f6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
            }}
          >
            🔑 管理模式
          </button>
        )}
      </div>

      {/* 密码输入模态框 */}
      {showPasswordModal && (
        <div 
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            minWidth: '360px',
            maxWidth: '420px',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <h3 style={{ 
              margin: '0 0 24px 0', 
              color: '#1f2937',
              fontSize: '20px',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              🔐 管理员验证
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                密码
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyPress={handleKeyPress}
                  placeholder="请输入管理员密码"
                  autoComplete="off"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 48px 12px 14px',
                    border: error ? '2px solid #ef4444' : '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none',
                    backgroundColor: loading ? '#f9fafb' : 'white',
                    color: '#1f2937',
                    caretColor: '#3b82f6',
                    transition: 'all 0.2s',
                    cursor: loading ? 'not-allowed' : 'text'
                  }}
                  onFocus={(e) => {
                    if (!error && !loading) {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!error && !loading) {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />
                
                {/* 显示/隐藏密码按钮 */}
                {!loading && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      fontSize: '18px',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.color = '#374151';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#6b7280';
                    }}
                    title={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                )}
              </div>
              
              {error && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  animation: 'shake 0.4s ease-in-out'
                }}>
                  <span style={{ fontSize: '16px' }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={handleCloseModal}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#e5e7eb' : '#f3f4f6',
                  color: loading ? '#9ca3af' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#e5e7eb';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
              >
                取消
              </button>
              <button
                onClick={handleVerifyPassword}
                disabled={loading}
                style={{
                  padding: '10px 24px',
                  backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.3)',
                  minWidth: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#2563eb';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#3b82f6';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}></span>
                    <span>验证中...</span>
                  </>
                ) : (
                  '确认'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default AdminModeToggle;
