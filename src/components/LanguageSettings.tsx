import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Globe, Search, Check, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

// Top 50 economies language + ISO mapping from Daksh4
const ECONOMY_LANGUAGES: Record<string, { lang: string; code: string }> = {
  'USA': { lang: 'English', code: 'en' },
  'CHN': { lang: 'Mandarin Chinese', code: 'zh-CN' },
  'JPN': { lang: 'Japanese', code: 'ja' },
  'DEU': { lang: 'German', code: 'de' },
  'IND': { lang: 'Hindi', code: 'hi' },
  'GBR': { lang: 'English', code: 'en' },
  'FRA': { lang: 'French', code: 'fr' },
  'BRA': { lang: 'Portuguese', code: 'pt' },
  'ITA': { lang: 'Italian', code: 'it' },
  'CAN': { lang: 'English', code: 'en' },
  'RUS': { lang: 'Russian', code: 'ru' },
  'KOR': { lang: 'Korean', code: 'ko' },
  'AUS': { lang: 'English', code: 'en' },
  'ESP': { lang: 'Spanish', code: 'es' },
  'MEX': { lang: 'Spanish', code: 'es' },
  'IDN': { lang: 'Indonesian', code: 'id' },
  'TUR': { lang: 'Turkish', code: 'tr' },
  'NLD': { lang: 'Dutch', code: 'nl' },
  'SAU': { lang: 'Arabic', code: 'ar' },
  'CHE': { lang: 'German', code: 'de' },
  'POL': { lang: 'Polish', code: 'pl' },
  'ARG': { lang: 'Spanish', code: 'es' },
  'SWE': { lang: 'Swedish', code: 'sv' },
  'BEL': { lang: 'French', code: 'fr' },
  'THA': { lang: 'Thai', code: 'th' },
  'ISR': { lang: 'Hebrew', code: 'iw' },
  'IRL': { lang: 'English', code: 'en' },
  'NOR': { lang: 'Norwegian', code: 'no' },
  'NGA': { lang: 'English', code: 'en' },
  'ARE': { lang: 'Arabic', code: 'ar' },
  'EGY': { lang: 'Arabic', code: 'ar' },
  'AUT': { lang: 'German', code: 'de' },
  'BGD': { lang: 'Bengali', code: 'bn' },
  'MYS': { lang: 'Malay', code: 'ms' },
  'VNM': { lang: 'Vietnamese', code: 'vi' },
  'ZAF': { lang: 'English', code: 'en' },
  'PHL': { lang: 'Tagalog', code: 'tl' },
  'DNK': { lang: 'Danish', code: 'da' },
  'IRN': { lang: 'Persian', code: 'fa' },
  'PAK': { lang: 'Urdu', code: 'ur' },
  'HKG': { lang: 'Traditional Chinese', code: 'zh-TW' },
  'COL': { lang: 'Spanish', code: 'es' },
  'ROU': { lang: 'Romanian', code: 'ro' },
  'CHL': { lang: 'Spanish', code: 'es' },
  'CZE': { lang: 'Czech', code: 'cs' },
  'FIN': { lang: 'Finnish', code: 'fi' },
  'IRQ': { lang: 'Arabic', code: 'ar' },
  'PRT': { lang: 'Portuguese', code: 'pt' },
  'NZL': { lang: 'English', code: 'en' },
  'PER': { lang: 'Spanish', code: 'es' },
};

// Unique language list for the grid
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', countries: 'USA, UK, AUS, CAN' },
  { code: 'zh-CN', name: 'Mandarin Chinese', flag: '🇨🇳', countries: 'China' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', countries: 'Japan' },
  { code: 'de', name: 'German', flag: '🇩🇪', countries: 'Germany, Austria, Switzerland' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', countries: 'India' },
  { code: 'fr', name: 'French', flag: '🇫🇷', countries: 'France, Belgium' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', countries: 'Brazil, Portugal' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', countries: 'Italy' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', countries: 'Russia' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', countries: 'South Korea' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', countries: 'Spain, Mexico, Argentina' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩', countries: 'Indonesia' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', countries: 'Turkey' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', countries: 'Netherlands' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', countries: 'Saudi Arabia, UAE, Egypt' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', countries: 'Poland' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪', countries: 'Sweden' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', countries: 'Thailand' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', countries: 'Vietnam' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰', countries: 'Pakistan' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩', countries: 'Bangladesh' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾', countries: 'Malaysia' },
  { code: 'da', name: 'Danish', flag: '🇩🇰', countries: 'Denmark' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮', countries: 'Finland' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴', countries: 'Norway' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴', countries: 'Romania' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿', countries: 'Czech Republic' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭', countries: 'Philippines' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷', countries: 'Iran' },
  { code: 'iw', name: 'Hebrew', flag: '🇮🇱', countries: 'Israel' },
  { code: 'zh-TW', name: 'Traditional Chinese', flag: '🇭🇰', countries: 'Hong Kong, Taiwan' },
];

const LANGUAGE_KEY = 'synapse-site-language';

function setTranslateCookie(langCode: string) {
  const value = `/en/${langCode}`;
  document.cookie = `googtrans=${value};path=/`;
  document.cookie = `googtrans=${value};path=/;domain=${window.location.hostname}`;
}

function getSavedLanguage(): string {
  return localStorage.getItem(LANGUAGE_KEY) || 'en';
}

async function ensureTranslateWidget(): Promise<void> {
  const hasCombo = Boolean(document.querySelector('.goog-te-combo'));
  if (hasCombo) return;

  const w = window as any;
  if (w.google?.translate && typeof w.google.translate.TranslateElement === 'function') {
    if (!document.querySelector('.goog-te-combo')) {
      new w.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const callbackName = '__synapseGoogleTranslateInit';
    (window as any)[callbackName] = () => {
      try {
        const win = window as any;
        new win.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
      } catch {
        // Ignore here; caller will retry.
      }
      resolve();
    };
    const script = document.createElement('script');
    script.src = `https://translate.google.com/translate_a/element.js?cb=${callbackName}`;
    script.async = true;
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

async function changeSiteLanguage(langCode: string) {
  localStorage.setItem(LANGUAGE_KEY, langCode);
  setTranslateCookie(langCode);

  await ensureTranslateWidget();

  const trySet = () => {
    const selectField = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (!selectField) return false;
    selectField.value = langCode;
    selectField.dispatchEvent(new Event('change'));
    return true;
  };

  if (trySet()) return;
  setTimeout(trySet, 500);
  setTimeout(trySet, 1200);
  setTimeout(trySet, 2200);
}

export default function LanguageSettings() {
  const [selected, setSelected] = useState(getSavedLanguage());
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const globeInitialized = useRef(false);
  const [globeLoaded, setGlobeLoaded] = useState(false);

  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.countries.toLowerCase().includes(search.toLowerCase())
  );

  const applyLanguage = (code: string) => {
    setSelected(code);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
    void changeSiteLanguage(code);
  };

  useEffect(() => {
    const saved = getSavedLanguage();
    setSelected(saved);
    if (saved && saved !== 'en') {
      void changeSiteLanguage(saved);
    }
  }, []);

  // Load globe.gl script dynamically
  useEffect(() => {
    if (typeof (window as any).Globe !== 'undefined') {
      setGlobeLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/globe.gl';
    script.async = true;
    script.onload = () => setGlobeLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize 3D globe when it loads
  useEffect(() => {
    if (!globeLoaded || globeInitialized.current || !globeContainerRef.current) return;
    
    const GlobeFn = (window as any).Globe;
    if (!GlobeFn) return;

    try {
      const world = GlobeFn()
        (globeContainerRef.current)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#00f2ff')
        .atmosphereAltitude(0.25);

      // Auto-rotate
      world.controls().autoRotate = true;
      world.controls().autoRotateSpeed = 1.0;
      world.controls().enableZoom = true;

      // Fetch country GeoJSON 
      fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(countries => {
          world.polygonsData(countries.features)
            .polygonAltitude(0.01)
            .polygonCapColor((feat: any) => {
              return ECONOMY_LANGUAGES[feat.properties.ISO_A3] 
                ? 'rgba(0, 240, 255, 0.4)' 
                : 'rgba(255, 255, 255, 0.05)';
            })
            .polygonSideColor(() => 'rgba(0, 240, 255, 0.1)')
            .polygonStrokeColor(() => '#00f0ff')
            .onPolygonHover((poly: any) => {
              if (poly) {
                const name = poly.properties.ADMIN;
                const iso = poly.properties.ISO_A3;
                const mapData = ECONOMY_LANGUAGES[iso];
                setHoveredCountry(name);
                setHoveredLang(mapData ? mapData.lang : 'English (Default)');
              } else {
                setHoveredCountry(null);
                setHoveredLang(null);
              }
            })
            .onPolygonClick((clicked: any) => {
              const iso = clicked.properties.ISO_A3;
              const mapData = ECONOMY_LANGUAGES[iso];
              
              if (mapData) {
                applyLanguage(mapData.code);
              } else {
                applyLanguage('en');
              }

              // Flash clicked country
              world.polygonCapColor((feat: any) => 
                feat === clicked ? '#ff0055' : 
                (ECONOMY_LANGUAGES[feat.properties.ISO_A3] ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 255, 255, 0.05)')
              );
            });
        });

      globeInitialized.current = true;
    } catch (e) {
      console.error('Globe init error:', e);
    }
  }, [globeLoaded]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Global <span className="gradient-text">Sync</span></h1>
            <p className="text-gray-500 text-sm">Click on a country or select a language below</p>
          </div>
        </div>
      </motion.div>

      {/* 3D Globe */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="glass rounded-2xl border border-white/10 overflow-hidden relative"
        style={{ background: 'radial-gradient(circle at center, rgba(0, 240, 255, 0.03), rgba(0,0,0,0.3))' }}
      >
        <div 
          ref={globeContainerRef} 
          className="w-full cursor-grab active:cursor-grabbing"
          style={{ height: '450px' }}
        />

        {/* Hover Info Overlay */}
        {hoveredCountry && (
          <div className="absolute top-5 left-5 glass px-4 py-3 rounded-xl border border-primary/30 pointer-events-none z-20"
            style={{ background: 'rgba(0,0,0,0.85)', boxShadow: '0 0 15px rgba(0,240,255,0.2)' }}>
            <p className="font-bold text-sm">{hoveredCountry}</p>
            <p className="text-primary text-xs">Language: {hoveredLang}</p>
          </div>
        )}

        {!globeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500 text-sm flex items-center gap-2">
              <Globe className="w-5 h-5 animate-spin" />
              Loading 3D Globe Engine...
            </div>
          </div>
        )}
      </motion.div>

      {/* Applied confirmation */}
      {applied && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold">
          <Check className="w-4 h-4" />
          Language preference saved!
        </motion.div>
      )}

      {/* Fallback Language Select + Search */}
      <div className="glass rounded-2xl p-5 border border-white/10">
        <p className="text-xs text-gray-500 mb-3 font-medium">Select a country on the globe above, or search manually below:</p>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search language or country..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 outline-none focus:border-primary/50 text-sm transition-colors"
          />
        </div>
      </div>

      {/* Language Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filtered.map((lang, i) => (
          <motion.button
            key={lang.code + lang.countries}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.015, duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => applyLanguage(lang.code)}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
              selected === lang.code
                ? "bg-primary/10 border-primary/30"
                : "bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20"
            )}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-bold truncate", selected === lang.code ? "text-primary" : "")}>{lang.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{lang.countries}</p>
            </div>
            {selected === lang.code && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-background" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Uses hidden Google Translate element from index.html */}
    </div>
  );
}
