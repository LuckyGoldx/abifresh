'use client';

import { useState, useEffect } from 'react';
import { NotificationService } from '@/lib/NotificationService';

/**
 * Example component demonstrating PWA notifications
 * Usage: Import and add to any page where you want to trigger notifications
 */
export default function NotificationExample() {
  const [isSupported, setIsSupported] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  useEffect(() => {
    setIsSupported(NotificationService.isSupported());
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsPushEnabled(!!subscription);
    }
  };

  const handleRequestPermission = async () => {
    const permission = await NotificationService.requestPermission();
    setIsSupported(permission === 'granted');
  };

  const handleShowNotification = (type: 'info' | 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'info':
        NotificationService.showInfo('Test Notification', 'This is an info notification');
        break;
      case 'success':
        NotificationService.showSuccess('Success!', 'Operation completed successfully');
        break;
      case 'warning':
        NotificationService.showWarning('Warning', 'Something needs your attention');
        break;
      case 'error':
        NotificationService.showError('Error', 'Something went wrong');
        break;
    }
  };

  const handleEnablePush = async () => {
    const subscription = await NotificationService.enablePushNotifications();
    if (subscription) {
      setIsPushEnabled(true);
      console.log('Push notifications enabled', subscription);
    }
  };

  const handleDisablePush = async () => {
    await NotificationService.disablePushNotifications();
    setIsPushEnabled(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="font-bold text-blue-900 mb-2">Notification Service</h3>
        <p className="text-sm text-blue-800 mb-4">
          Status: {isSupported ? '✅ Enabled' : '❌ Disabled'}
        </p>

        {!isSupported && (
          <button
            onClick={handleRequestPermission}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Enable Notifications
          </button>
        )}

        {isSupported && (
          <div className="space-y-2">
            <p className="text-sm font-semibold mb-2">Test Notifications:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleShowNotification('info')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                Info
              </button>
              <button
                onClick={() => handleShowNotification('success')}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                Success
              </button>
              <button
                onClick={() => handleShowNotification('warning')}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
              >
                Warning
              </button>
              <button
                onClick={() => handleShowNotification('error')}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Error
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm font-semibold mb-2">Push Notifications:</p>
              {!isPushEnabled ? (
                <button
                  onClick={handleEnablePush}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Enable Push Notifications
                </button>
              ) : (
                <button
                  onClick={handleDisablePush}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                >
                  Disable Push Notifications
                </button>
              )}
              <p className="text-xs text-blue-700 mt-2">
                {isPushEnabled ? '✅ Push enabled' : '⚠️ Push disabled'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
