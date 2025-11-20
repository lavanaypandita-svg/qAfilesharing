import React, { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import P2PFileTransfer from '../Files/P2PFileTransfer';
import { FiLogOut, FiUpload, FiDownload, FiUser, FiFile, FiShare2, FiSettings, FiAlertCircle } from 'react-icons/fi';

const Dashboard = () => {
  const { logout, user } = useAuth();
  const { socket, myId } = useSocket();
  const navigate = useNavigate();
  const [showP2PTransfer, setShowP2PTransfer] = useState(false);
  const [activeTab, setActiveTab] = useState('my-files');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Secure File Share</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Your ID:</span>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md">
                  <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{myId}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(myId);
                      // You might want to add a toast notification here
                    }}
                    className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Copy to clipboard"
                  >
                    <FiCopy size={16} />
                  </button>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FiLogOut className="mr-2 h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Free Plan</p>
                  </div>
                </div>
              </div>
              <nav className="p-2">
                <button
                  onClick={() => setActiveTab('my-files')}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md mb-1 ${
                    activeTab === 'my-files'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiFile className="mr-3 h-5 w-5" />
                  My Files
                </button>
                <button
                  onClick={() => setActiveTab('shared')}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md mb-1 ${
                    activeTab === 'shared'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiShare2 className="mr-3 h-5 w-5" />
                  Shared with me
                </button>
                <button
                  onClick={() => setActiveTab('honeyfiles')}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md mb-1 ${
                    activeTab === 'honeyfiles'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiAlertCircle className="mr-3 h-5 w-5" />
                  Honeyfiles
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'settings'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiSettings className="mr-3 h-5 w-5" />
                  Settings
                </button>
              </nav>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowP2PTransfer(true)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <FiShare2 className="mr-2 h-4 w-4" />
                  Send File P2P
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              {activeTab === 'my-files' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">My Files</h2>
                    <button
                      onClick={() => {
                        // Handle file upload
                        document.getElementById('file-upload')?.click();
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FiUpload className="mr-2 h-4 w-4" />
                      Upload File
                    </button>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        // Handle file upload
                        const file = e.target.files?.[0];
                        if (file) {
                          // Implement file upload logic here
                          console.log('File selected:', file);
                        }
                      }}
                    />
                  </div>
                  
                  {/* File List */}
                  <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {/* Example file item */}
                      <li>
                        <div className="px-4 py-4 flex items-center sm:px-6">
                          <div className="min-w-0 flex-1 flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                              <FiFile className="h-6 w-6" />
                            </div>
                            <div className="min-w-0 flex-1 px-4">
                              <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">example-document.pdf</p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">2.4 MB • 3 days ago</p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-5 flex-shrink-0">
                            <button
                              onClick={() => {
                                // Handle download
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <FiDownload className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </li>
                      
                      {/* More file items can be added here */}
                      
                      {[1, 2, 3].map((i) => (
                        <li key={i} className="opacity-50">
                          <div className="px-4 py-4 flex items-center sm:px-6">
                            <div className="min-w-0 flex-1 flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-400">
                                <FiFile className="h-6 w-6" />
                              </div>
                              <div className="min-w-0 flex-1 px-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">file-{i}.pdf</p>
                                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">1.{i} MB • {i} day{i !== 1 ? 's' : ''} ago</p>
                                </div>
                              </div>
                            </div>
                            <div className="ml-5 flex-shrink-0">
                              <button className="text-gray-400 hover:text-gray-500">
                                <FiDownload className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'shared' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Shared with me</h2>
                  <div className="text-center py-12">
                    <FiShare2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No shared files</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Files shared with you will appear here.</p>
                  </div>
                </div>
              )}

              {activeTab === 'honeyfiles' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Honeyfiles</h2>
                  <div className="text-center py-12">
                    <FiAlertCircle className="mx-auto h-12 w-12 text-yellow-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No honeyfiles</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Honeyfiles will appear here when accessed.</p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Account</h3>
                      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              name="email"
                              id="email"
                              value={user?.email || ''}
                              disabled
                              className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm dark:text-white"
                            />
                          </div>
                          <div className="mb-4">
                            <label htmlFor="user-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Your User ID
                            </label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                              <input
                                type="text"
                                name="user-id"
                                id="user-id"
                                value={myId || 'Connecting...'}
                                readOnly
                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                              />
                              <button
                                onClick={() => {
                                  if (myId) {
                                    navigator.clipboard.writeText(myId);
                                    // You might want to add a toast notification here
                                  }
                                }}
                                className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                Copy
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Share this ID with others to receive files directly</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Security</h3>
                      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <FiShield className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">End-to-end encryption</h4>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                All files are encrypted on your device before being sent. Only you and the recipient can access the contents.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Danger Zone</h3>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <FiAlertTriangle className="h-5 w-5 text-red-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Delete account</h3>
                            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                              <p>Once you delete your account, there is no going back. Please be certain.</p>
                            </div>
                            <div className="mt-4">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-100 dark:bg-red-800 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                onClick={() => {
                                  // Handle account deletion
                                  if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                                    // Implement account deletion
                                  }
                                }}
                              >
                                Delete account
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* P2P File Transfer Modal */}
      {showP2PTransfer && (
        <P2PFileTransfer onClose={() => setShowP2PTransfer(false)} />
      )}
    </div>
  );
};

export default Dashboard;
