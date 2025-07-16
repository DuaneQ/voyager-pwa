import { useState, useEffect } from 'react';

interface WatermarkSettings {
  enabled: boolean;
  showOnOwnVideos: boolean;
  showOnSharedVideos: boolean;
}

const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  enabled: true,
  showOnOwnVideos: false, // Don't show watermark on user's own videos by default
  showOnSharedVideos: true, // Show watermark when sharing/viewing others' videos
};

const STORAGE_KEY = 'travalpass_watermark_settings';

/**
 * Hook for managing watermark display settings
 */
export function useWatermarkSettings() {
  const [settings, setSettings] = useState<WatermarkSettings>(DEFAULT_WATERMARK_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored) as WatermarkSettings;
        setSettings({ ...DEFAULT_WATERMARK_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.warn('Failed to load watermark settings from localStorage:', error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save watermark settings to localStorage:', error);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<WatermarkSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const shouldShowWatermark = (isOwnVideo: boolean): boolean => {
    if (!settings.enabled) return false;
    
    if (isOwnVideo) {
      return settings.showOnOwnVideos;
    } else {
      return settings.showOnSharedVideos;
    }
  };

  return {
    settings,
    updateSettings,
    shouldShowWatermark,
  };
}

/**
 * Component for watermark settings in user preferences
 */
export interface WatermarkSettingsProps {
  onSettingsChange?: (settings: WatermarkSettings) => void;
}

export const WatermarkSettingsComponent: React.FC<WatermarkSettingsProps> = ({
  onSettingsChange
}) => {
  const { settings, updateSettings } = useWatermarkSettings();

  const handleSettingChange = (key: keyof WatermarkSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    updateSettings({ [key]: value });
    onSettingsChange?.(newSettings);
  };

  return (
    <div className="watermark-settings" data-testid="watermark-settings">
      <h3>Video Branding Settings</h3>
      <p className="settings-description">
        TravalPass.com watermarks help promote the app when your videos are shared outside the platform.
      </p>
      
      <div className="setting-item">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => handleSettingChange('enabled', e.target.checked)}
            data-testid="watermark-enabled"
          />
          <span>Enable TravalPass.com watermarks</span>
        </label>
        <p className="setting-help">
          Show TravalPass.com branding on videos to help others discover the app
        </p>
      </div>

      {settings.enabled && (
        <>
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.showOnOwnVideos}
                onChange={(e) => handleSettingChange('showOnOwnVideos', e.target.checked)}
                data-testid="watermark-own-videos"
              />
              <span>Show watermark on my own videos</span>
            </label>
            <p className="setting-help">
              Display watermark when viewing your own video content
            </p>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.showOnSharedVideos}
                onChange={(e) => handleSettingChange('showOnSharedVideos', e.target.checked)}
                data-testid="watermark-shared-videos"
              />
              <span>Show watermark on other users' videos</span>
            </label>
            <p className="setting-help">
              Display watermark when viewing videos from other users (recommended for app promotion)
            </p>
          </div>
        </>
      )}
    </div>
  );
};
