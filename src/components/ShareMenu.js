import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Monitor,
  Send,
  Share2,
  Smartphone,
  Twitter,
} from 'lucide-react';
import { LocalShareService } from '../services/LocalShareService';
import './ShareMenu.css';

const PLATFORM_ICONS = {
  x: Twitter,
  bluesky: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.599 1.5 2.92c-.054 1.151.753 2.014 2.765 3.08 1.449.806 3.843 2.171 4.322 2.531.598.448.502 1.168-.193 1.168-.741 0-3.064-2.571-4.091-3.481C3.19 5.994 1.613 5.5 1 5.5c-.787 0-.787.787-.787.787 0 1.021 1.593 3.07 4.2 4.98 2.604 1.907 5.57 2.479 7.587 2.479 2.017 0 4.983-.572 7.587-2.479 2.607-1.91 4.2-3.959 4.2-4.98 0 0 0-.787-.787-.787-.613 0-2.19.494-3.703 1.718-1.027.91-3.35 3.481-4.091 3.481-.695 0-.791-.72-.193-1.168.479-.36 2.873-1.725 4.322-2.531 2.012-1.066 2.819-1.929 2.765-3.08-.061-1.321-1.066-1.976-2.702-.115-2.752 1.942-5.711 5.881-6.798 7.995z" />
    </svg>
  ),
  threads: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01V11.8c.02-2.588.836-5.06 2.39-7.31C5.935 2.05 8.505.453 11.52.052c3.46-.46 6.74.674 9.25 3.24 1.187 1.21 1.902 2.663 2.127 4.322.056.42.077.843.064 1.265l-.012.307H17.04c.017 3.053.927 4.84 2.71 5.331 1.44.393 2.978-.017 4.043-1.05.223-.218.359-.49.359-.783 0-.333-.177-.642-.459-.807-.533-.297-1.518-.64-3.033-.73l-.48-.03c-.548-.035-.99-.32-1.193-.758-.189-.41-.137-.893.136-1.258.49-.655 1.36-.99 2.589-.99.992 0 2.082.237 3.078.681.028.9-.123 1.77-.45 2.58-1.011 2.468-3.45 4.023-6.44 4.117-3.67.117-6.126-1.465-7.167-4.54-.44-1.316-.53-2.826-.53-4.145 0-.762.027-1.505.082-2.221.279-3.67 2.338-5.98 5.625-6.252 2.91-.24 5.405.91 6.468 3.01.115.223.173.473.173.724 0 .655-.532 1.188-1.188 1.188-.49 0-.922-.297-1.104-.743-.508-1.24-1.849-1.953-3.636-1.89-2.34.08-3.46 1.588-3.638 3.93-.02.282-.04.585-.04.9 0 1.2.085 2.402.51 3.52.61 1.63 1.797 2.48 3.43 2.47 1.745-.012 2.85-.892 3.09-2.425.035-.215.035-.434 0-.65-.13-.862-.8-1.47-1.77-1.6-.34-.047-.684-.047-1.022 0-.558.078-.998-.24-1.138-.753-.148-.544.09-1.102.59-1.37.61-.325 1.397-.448 2.2-.34 1.618.22 2.68 1.235 2.902 2.78.065.45.074.91.026 1.365-.228 2.24-1.76 3.78-4.09 4.05-.63.074-1.27.074-1.9 0-.18-.02-.36-.05-.53-.09z" />
    </svg>
  ),
  mastodon: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.193 7.879c0-5.206-3.411-6.732-3.411-6.732C18.062.357 15.108.025 12.041 0h-.076c-3.066.025-6.02.357-7.74 1.147 0 0-3.411 1.526-3.411 6.732 0 1.192-.023 2.618.014 4.129.124 4.885.935 9.698 5.647 10.89 2.17.574 4.034.695 5.535.612 2.722-.15 4.25-.972 4.25-.972l-.09-1.977s-1.945.615-4.129.54c-2.165-.074-4.454-.233-4.811-2.886a5.5 5.5 0 0 1-.048-.829s2.132.52 4.835.644c1.651.082 3.198-.104 4.772-.313 3.01-.426 5.631-2.627 5.971-4.695.527-3.239.432-7.906.432-7.906zM19.05 14.02h-2.587V8.5s0-2.54-2.538-2.54c-2.539 0-2.538 2.54-2.538 2.54v5.52H8.801V8.5s0-4.235 4.124-4.235c4.124 0 4.124 4.235 4.124 4.235v5.52z" />
    </svg>
  ),
  reddit: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.25 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484 1.106 4.381 1.106 1.898 0 3.54-.264 4.381-1.106a.331.331 0 0 0-.231-.563c-.232 0-.419.1-.528.173-.79.593-2.484.79-3.622.79s-2.833-.197-3.622-.79a.327.327 0 0 0-.528-.173z" />
    </svg>
  ),
  discord: MessageCircle,
  facebook: Facebook,
  linkedin: Linkedin,
  whatsapp: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  ),
  telegram: Send,
  email: Mail,
};

const ORDER = ['x', 'bluesky', 'threads', 'reddit', 'discord', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'email', 'mastodon'];
const SUPPORTED_CHANNELS = LocalShareService.getSupportedChannels();
const SUPPORTED_IDS = new Set(SUPPORTED_CHANNELS.map((channel) => channel.id));

export function ShareMenu({ onCopyText, onCopyImage, onSaveImage, onShareText, onDownloadText, onNativeShare, imageAvailable, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const canCopyImage = LocalShareService.canCopyImage();
  const canNativeShare = LocalShareService.canUseNativeShare();

  const close = () => setIsOpen(false);

  const handleCopyText = async () => {
    const success = await onCopyText();
    if (success) {
      setCopied('text');
      setTimeout(() => setCopied((current) => (current === 'text' ? null : current)), 2000);
    }
    close();
  };

  const handleCopyImage = async () => {
    const success = await onCopyImage();
    if (success) {
      setCopied('image');
      setTimeout(() => setCopied((current) => (current === 'image' ? null : current)), 2000);
    }
    close();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setIsOpen(false);
      });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="share-menu" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        className="share-menu-trigger"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Share2 size={16} />
        <span>{disabled ? 'Preparing...' : 'Share'}</span>
      </button>

      {isOpen && (
        <div className="share-menu-dropdown" role="menu">
          {imageAvailable && (
            <div className="share-menu-group">
              <span className="share-menu-label">Image</span>
              <button type="button" role="menuitem" onClick={onSaveImage}>
                <Download size={16} />
                <span>Save share image</span>
              </button>
              {canCopyImage && (
                <button type="button" role="menuitem" onClick={handleCopyImage}>
                  {copied === 'image' ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied === 'image' ? 'Image copied' : 'Copy image'}</span>
                </button>
              )}
            </div>
          )}

          <div className="share-menu-group">
            <span className="share-menu-label">Text</span>
            <button type="button" role="menuitem" onClick={handleCopyText}>
              {copied === 'text' ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied === 'text' ? 'Text copied' : 'Copy share text'}</span>
            </button>
            <button type="button" role="menuitem" onClick={() => { onDownloadText(); close(); }}>
              <Download size={16} />
              <span>Download caption</span>
            </button>
          </div>

          <div className="share-menu-group">
            <span className="share-menu-label">Platforms</span>
            {ORDER.filter((channelId) => SUPPORTED_IDS.has(channelId)).map((channelId) => {
              const config = SUPPORTED_CHANNELS.find((channel) => channel.id === channelId);
              if (!config) return null;
              const Icon = PLATFORM_ICONS[channelId] || Monitor;
              return (
                <button
                  key={channelId}
                  type="button"
                  role="menuitem"
                  onClick={() => { onShareText(channelId); close(); }}
                >
                  <Icon size={16} />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          {canNativeShare && (
            <div className="share-menu-group">
              <span className="share-menu-label">Device</span>
              <button type="button" role="menuitem" onClick={() => { onNativeShare(); close(); }}>
                <Smartphone size={16} />
                <span>Native share</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ShareMenu;
