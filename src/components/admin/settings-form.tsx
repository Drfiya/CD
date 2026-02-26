'use client';

import { useTransition, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  updateCommunitySettings,
  uploadCommunityLogo,
  removeCommunityLogo,
  uploadCommunityLogoDark,
  removeCommunityLogoDark,
  updateLogoSize,
  uploadSidebarBanner,
  removeSidebarBanner,
  updateSidebarBannerSettings,
  type CommunitySettings,
} from '@/lib/settings-actions';

interface SettingsFormProps {
  settings: CommunitySettings;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploadPending, startUploadTransition] = useTransition();
  const [isRemovePending, startRemoveTransition] = useTransition();
  const [isDarkUploadPending, startDarkUploadTransition] = useTransition();
  const [isDarkRemovePending, startDarkRemoveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    settings.communityLogo
  );
  const [darkLogoPreview, setDarkLogoPreview] = useState<string | null>(
    settings.communityLogoDark
  );
  const [logoSize, setLogoSize] = useState(settings.logoSize || 36);
  const [isSizePending, startSizeTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const darkFileInputRef = useRef<HTMLInputElement>(null);
  const sizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [isBannerUploadPending, startBannerUploadTransition] = useTransition();
  const [isBannerRemovePending, startBannerRemoveTransition] = useTransition();
  const [isBannerSettingsPending, startBannerSettingsTransition] = useTransition();
  const [bannerPreview, setBannerPreview] = useState<string | null>(settings.sidebarBannerImage);
  const [bannerUrl, setBannerUrl] = useState(settings.sidebarBannerUrl || '');
  const [bannerEnabled, setBannerEnabled] = useState(settings.sidebarBannerEnabled);

  const handleLogoSizeChange = useCallback((newSize: number) => {
    setLogoSize(newSize);
    // Debounce the save
    if (sizeTimeoutRef.current) clearTimeout(sizeTimeoutRef.current);
    sizeTimeoutRef.current = setTimeout(() => {
      startSizeTransition(async () => {
        const result = await updateLogoSize(newSize);
        if (result.error) {
          toast.error(result.error);
        }
      });
    }, 500);
  }, []);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      setError(null);
      const result = await updateCommunitySettings(formData);

      if ('error' in result && result.error) {
        if (typeof result.error === 'string') {
          setError(result.error);
          toast.error(result.error);
        } else if (typeof result.error === 'object') {
          const fieldErrors = result.error as Record<string, string[]>;
          const firstError = Object.values(fieldErrors).flat()[0];
          setError(firstError || 'Invalid input');
          toast.error(firstError || 'Invalid input');
        }
        return;
      }

      toast.success('Settings saved successfully');
      router.refresh();
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    const formData = new FormData();
    formData.append('logo', file);

    startUploadTransition(async () => {
      const result = await uploadCommunityLogo(formData);

      if ('error' in result && result.error) {
        // Revert preview on error
        setLogoPreview(settings.communityLogo);
        const errorMsg =
          typeof result.error === 'string'
            ? result.error
            : Object.values(result.error as Record<string, string[]>).flat()[0] ||
            'Upload failed';
        toast.error(errorMsg);
        return;
      }

      toast.success('Logo uploaded successfully');
      if (result.url) {
        setLogoPreview(result.url);
      }
      router.refresh();
    });
  };

  const handleLogoRemove = () => {
    startRemoveTransition(async () => {
      const result = await removeCommunityLogo();

      if ('error' in result && result.error) {
        toast.error(result.error);
        return;
      }

      setLogoPreview(null);
      toast.success('Logo removed');
      router.refresh();
    });
  };

  const handleDarkLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setDarkLogoPreview(previewUrl);

    const formData = new FormData();
    formData.append('logo', file);

    startDarkUploadTransition(async () => {
      const result = await uploadCommunityLogoDark(formData);

      if ('error' in result && result.error) {
        setDarkLogoPreview(settings.communityLogoDark);
        const errorMsg =
          typeof result.error === 'string'
            ? result.error
            : Object.values(result.error as Record<string, string[]>).flat()[0] ||
            'Upload failed';
        toast.error(errorMsg);
        return;
      }

      toast.success('Dark mode logo uploaded successfully');
      if (result.url) {
        setDarkLogoPreview(result.url);
      }
      router.refresh();
    });
  };

  const handleDarkLogoRemove = () => {
    startDarkRemoveTransition(async () => {
      const result = await removeCommunityLogoDark();

      if ('error' in result && result.error) {
        toast.error(result.error);
        return;
      }

      setDarkLogoPreview(null);
      toast.success('Dark mode logo removed');
      router.refresh();
    });
  };

  const anyPending = isPending || isUploadPending || isRemovePending || isDarkUploadPending || isDarkRemovePending || isSizePending || isBannerUploadPending || isBannerRemovePending || isBannerSettingsPending;

  return (
    <div className="space-y-6">
      {/* Light Logo Section */}
      <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
        <h2 className="text-lg font-medium mb-1">Community Logo</h2>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mb-4">
          This logo is shown on light backgrounds (light mode header, landing page).
        </p>
        <div className="flex items-start gap-6">
          {/* Logo Preview */}
          <div className="flex-shrink-0">
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Community logo"
                width={300}
                height={167}
                unoptimized
                className="h-24 w-auto max-w-[180px] rounded-lg object-contain border bg-white p-1"
              />
            ) : (
              <div className="h-24 w-32 rounded-lg bg-muted flex items-center justify-center border">
                <span className="text-muted-foreground text-sm">No logo</span>
              </div>
            )}
          </div>

          {/* Upload/Remove Buttons */}
          <div className="flex-1 space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a logo for your community. Supports any aspect ratio (e.g. 300×167).
              Max file size: 2MB. Supports JPEG, PNG, WebP, and SVG.
            </p>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={anyPending}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={anyPending}
              >
                {isUploadPending ? 'Uploading...' : 'Upload Logo'}
              </Button>
              {logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleLogoRemove}
                  disabled={anyPending}
                  className="text-destructive hover:text-destructive"
                >
                  {isRemovePending ? 'Removing...' : 'Remove'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dark Mode Logo Section */}
      <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
        <h2 className="text-lg font-medium mb-1">Dark Mode Logo</h2>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mb-4">
          This logo is shown on dark backgrounds (dark mode header). If not set, the light logo is used.
        </p>
        <div className="flex items-start gap-6">
          {/* Dark Logo Preview */}
          <div className="flex-shrink-0">
            {darkLogoPreview ? (
              <Image
                src={darkLogoPreview}
                alt="Dark mode logo"
                width={300}
                height={167}
                unoptimized
                className="h-24 w-auto max-w-[180px] rounded-lg object-contain border bg-neutral-900 p-1"
              />
            ) : (
              <div className="h-24 w-32 rounded-lg bg-neutral-800 flex items-center justify-center border border-neutral-700">
                <span className="text-neutral-400 text-sm">No logo</span>
              </div>
            )}
          </div>

          {/* Upload/Remove Buttons */}
          <div className="flex-1 space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a logo optimized for dark backgrounds.
              Max file size: 2MB. Supports JPEG, PNG, WebP, and SVG.
            </p>
            <div className="flex gap-3">
              <input
                ref={darkFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleDarkLogoUpload}
                className="hidden"
                disabled={anyPending}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => darkFileInputRef.current?.click()}
                disabled={anyPending}
              >
                {isDarkUploadPending ? 'Uploading...' : 'Upload Dark Logo'}
              </Button>
              {darkLogoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDarkLogoRemove}
                  disabled={anyPending}
                  className="text-destructive hover:text-destructive"
                >
                  {isDarkRemovePending ? 'Removing...' : 'Remove'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logo Size Slider - visible when at least one logo is uploaded */}
      {(logoPreview || darkLogoPreview) && (
        <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-200">
              Logo Size
            </label>
            <span className="text-xs text-gray-500 dark:text-neutral-400 tabular-nums">
              {logoSize}px
            </span>
          </div>
          <input
            type="range"
            min={20}
            max={80}
            step={1}
            value={logoSize}
            onChange={(e) => handleLogoSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            disabled={anyPending}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-neutral-400 mt-1">
            <span>Klein</span>
            <span>Groß</span>
          </div>

          {/* Side-by-side preview */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* Light preview */}
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="text-xs text-gray-500 dark:text-neutral-400 mb-2">Light Mode:</p>
              <div className="flex items-center h-16">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Light logo preview"
                    width={300}
                    height={167}
                    unoptimized
                    className="w-auto object-contain"
                    style={{ height: `${logoSize}px` }}
                  />
                ) : (
                  <span className="text-xs text-gray-500 dark:text-neutral-400 italic">No light logo</span>
                )}
              </div>
            </div>
            {/* Dark preview */}
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700">
              <p className="text-xs text-neutral-400 mb-2">Dark Mode:</p>
              <div className="flex items-center h-16">
                {darkLogoPreview ? (
                  <Image
                    src={darkLogoPreview}
                    alt="Dark logo preview"
                    width={300}
                    height={167}
                    unoptimized
                    className="w-auto object-contain"
                    style={{ height: `${logoSize}px` }}
                  />
                ) : logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Fallback logo preview"
                    width={300}
                    height={167}
                    unoptimized
                    className="w-auto object-contain opacity-50"
                    style={{ height: `${logoSize}px` }}
                  />
                ) : (
                  <span className="text-xs text-neutral-500 italic">No logo</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Banner Section */}
      <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-neutral-100">Sidebar Banner</h2>
        <p className="text-sm text-muted-foreground">Upload a banner image (9:16 format recommended, e.g. 1080×1920px) that appears below the categories in the feed sidebar.</p>

        {/* Banner Preview */}
        {bannerPreview && (
          <div className="relative w-48 mx-auto">
            <div className="aspect-[9/16] rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700">
              <img
                src={bannerPreview}
                alt="Sidebar banner preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Upload / Remove */}
        <div className="flex items-center gap-3">
          <input
            ref={bannerFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              startBannerUploadTransition(async () => {
                const formData = new FormData();
                formData.append('banner', file);
                const result = await uploadSidebarBanner(formData);
                if ('error' in result && result.error) {
                  toast.error(typeof result.error === 'string' ? result.error : 'Upload failed');
                } else if (result.url) {
                  setBannerPreview(result.url);
                  setBannerEnabled(true);
                  toast.success('Banner uploaded!');
                  router.refresh();
                }
              });
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={anyPending}
            onClick={() => bannerFileInputRef.current?.click()}
          >
            {isBannerUploadPending ? 'Uploading...' : bannerPreview ? 'Replace Banner' : 'Upload Banner'}
          </Button>
          {bannerPreview && (
            <Button
              type="button"
              variant="destructive"
              disabled={anyPending}
              onClick={() => {
                startBannerRemoveTransition(async () => {
                  const result = await removeSidebarBanner();
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    setBannerPreview(null);
                    setBannerEnabled(false);
                    setBannerUrl('');
                    toast.success('Banner removed');
                    router.refresh();
                  }
                });
              }}
            >
              {isBannerRemovePending ? 'Removing...' : 'Remove'}
            </Button>
          )}
        </div>

        {/* Banner URL */}
        {bannerPreview && (
          <div className="space-y-2">
            <label htmlFor="bannerUrl" className="text-sm font-medium text-gray-700 dark:text-neutral-200">
              Link URL (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="bannerUrl"
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 border dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <Button
                type="button"
                variant="outline"
                disabled={anyPending}
                onClick={() => {
                  startBannerSettingsTransition(async () => {
                    const result = await updateSidebarBannerSettings({ sidebarBannerUrl: bannerUrl || null });
                    if (result.error) {
                      toast.error(result.error);
                    } else {
                      toast.success('Link saved');
                      router.refresh();
                    }
                  });
                }}
              >
                {isBannerSettingsPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              When set, clicking the banner opens this URL.
            </p>
          </div>
        )}

        {/* Enable/Disable Toggle */}
        {bannerPreview && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-gray-700 dark:text-neutral-200">Show banner on feed page</span>
            <button
              type="button"
              role="switch"
              aria-checked={bannerEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${bannerEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-neutral-600'
                }`}
              onClick={() => {
                const newValue = !bannerEnabled;
                setBannerEnabled(newValue);
                startBannerSettingsTransition(async () => {
                  const result = await updateSidebarBannerSettings({ sidebarBannerEnabled: newValue });
                  if (result.error) {
                    toast.error(result.error);
                    setBannerEnabled(!newValue);
                  } else {
                    toast.success(newValue ? 'Banner enabled' : 'Banner disabled');
                    router.refresh();
                  }
                });
              }}
              disabled={anyPending}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${bannerEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Details Form */}
      <form action={handleSubmit}>
        <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-neutral-100">Community Details</h2>

          {/* Community Name */}
          <div className="space-y-2">
            <label
              htmlFor="communityName"
              className="text-sm font-medium text-gray-700 dark:text-neutral-200"
            >
              Community Name <span className="text-destructive">*</span>
            </label>
            <input
              id="communityName"
              name="communityName"
              type="text"
              required
              maxLength={100}
              defaultValue={settings.communityName}
              placeholder="Enter community name"
              className="w-full px-3 py-2 border dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isPending}
            />
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              1-100 characters. This name appears in the sidebar and header.
            </p>
          </div>

          {/* Community Description */}
          <div className="space-y-2">
            <label
              htmlFor="communityDescription"
              className="text-sm font-medium text-gray-700 dark:text-neutral-200"
            >
              Description
            </label>
            <textarea
              id="communityDescription"
              name="communityDescription"
              rows={4}
              maxLength={1000}
              defaultValue={settings.communityDescription || ''}
              placeholder="Describe your community (optional)"
              className="w-full px-3 py-2 border dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={isPending}
            />
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              Up to 1000 characters.
            </p>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Submit Button */}
          <div className="pt-2">
            <Button type="submit" disabled={anyPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
