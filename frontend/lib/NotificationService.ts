'use client';

/**
 * PWA Notifications Service
 * Handles Web Notifications API for PWA
 * Supports both regular notifications and service worker push notifications
 */

export class NotificationService {
  /**
   * Request permission to show notifications
   * @returns {Promise<NotificationPermission>}
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Show a notification
   * @param {string} title - Notification title
   * @param {NotificationOptions} options - Notification options
   */
  static showNotification(title: string, options?: NotificationOptions): Notification | null {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return null;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    return new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options,
    });
  }

  /**
   * Show a notification in service worker
   * Used for background/push notifications
   */
  static async sendServiceWorkerNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options,
    });
  }

  /**
   * Check if notifications are supported and enabled
   */
  static isSupported(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Show info notification
   */
  static showInfo(title: string, body?: string): void {
    this.showNotification(title, {
      body,
      tag: 'info',
    });
  }

  /**
   * Show success notification
   */
  static showSuccess(title: string, body?: string): void {
    this.showNotification(title, {
      body,
      tag: 'success',
    });
  }

  /**
   * Show warning notification
   */
  static showWarning(title: string, body?: string): void {
    this.showNotification(title, {
      body,
      tag: 'warning',
    });
  }

  /**
   * Show error notification
   */
  static showError(title: string, body?: string): void {
    this.showNotification(title, {
      body,
      tag: 'error',
    });
  }

  /**
   * Enable push notifications via service worker
   * Requires valid push subscription endpoint
   */
  static async enablePushNotifications(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        return subscription;
      }

      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
      }

      // Subscribe to push notifications
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ) as BufferSource,
      });

      return newSubscription;
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      return null;
    }
  }

  /**
   * Convert base64 string to Uint8Array
   * Needed for push subscription
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Disable push notifications
   */
  static async disablePushNotifications(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
    }
  }
}

/**
 * Hook to use notification service
 */
export function useNotificationService() {
  return NotificationService;
}
