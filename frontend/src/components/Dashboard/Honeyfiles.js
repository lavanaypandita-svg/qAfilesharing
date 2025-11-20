import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiShield, FiAlertTriangle } from 'react-icons/fi';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Honeyfiles = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/honeyfiles/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching honeyfile stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-quantum-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Honeyfiles</h2>
        <p className="text-gray-600">
          Decoy files that alert you when accessed by unauthorized users
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">Total Honeyfiles</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">
                {stats?.totalHoneyfiles || 0}
              </p>
            </div>
            <FiShield className="h-12 w-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Triggered</p>
              <p className="text-3xl font-bold text-red-900 mt-2">
                {stats?.triggeredHoneyfiles || 0}
              </p>
            </div>
            <FiAlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Success Rate</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {stats?.totalHoneyfiles > 0
                  ? Math.round(
                      ((stats.totalHoneyfiles - stats.triggeredHoneyfiles) /
                        stats.totalHoneyfiles) *
                        100
                    )
                  : 100}
                %
              </p>
            </div>
            <FiShield className="h-12 w-12 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Trigger Events */}
      {stats?.triggers && stats.triggers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Triggers</h3>
          <div className="space-y-3">
            {stats.triggers.map((trigger, index) => (
              <div
                key={index}
                className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-900">
                      Unauthorized access detected
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      User: {trigger.user?.username || trigger.user?.email || 'Unknown'} •{' '}
                      {trigger.file?.originalName || trigger.file?.filename || 'Unknown file'}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {format(new Date(trigger.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                  <FiAlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!stats?.triggers || stats.triggers.length === 0) && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FiShield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-500">No honeyfile triggers detected</p>
          <p className="text-sm text-gray-400 mt-2">
            Your honeyfiles are working as intended
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">How Honeyfiles Work</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Mark files as honeyfiles when uploading</li>
          <li>• Honeyfiles appear as normal files to unauthorized users</li>
          <li>• When accessed, an alert is triggered and logged</li>
          <li>• Use honeyfiles to detect unauthorized access attempts</li>
        </ul>
      </div>
    </div>
  );
};

export default Honeyfiles;

