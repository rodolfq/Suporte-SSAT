'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { createAvatar } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';
import { motion } from 'motion/react';
import { X, Check, RefreshCw, Palette, User, Shirt, Eye } from 'lucide-react';

interface AvatarCreatorProps {
  onSave: (url: string, options: any) => void;
  onClose: () => void;
  initialName: string;
  initialOptions?: any;
}

const HAIR_OPTIONS = [
  'noHair', 'hat', 'hijab', 'turban', 'winterHat01', 'winterHat02', 'winterHat03', 'winterHat04', 
  'bigHair', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'frida', 'fro', 'froBand', 'longButNotTooLong', 
  'miaWallace', 'shavedSides', 'straight01', 'straight02', 'straightAndStrand', 'dreads01', 'dreads02', 
  'frizzle', 'shaggy', 'shaggyMullet', 'shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 
  'sides', 'theCaesar'
];

const FACIAL_HAIR_OPTIONS = ['none', 'beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy', 'moustacheMagnum'];
const ACCESSORIES_OPTIONS = ['none', 'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers', 'eyepatch'];
const SKIN_COLORS = ['614335', 'ae5d29', 'd08b5b', 'edb98a', 'f8d25c', 'fd9841', 'ffdbac'];
const HAIR_COLORS = ['2c1b18', '4a312c', '724130', 'a55728', 'b58143', 'c93305', 'e8c194', 'f59700'];
const EYE_OPTIONS = ['close', 'cry', 'default', 'dizzy', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky'];
const EYEBROW_OPTIONS = ['angry', 'angryNatural', 'default', 'defaultNatural', 'flatNatural', 'frownNatural', 'raisedExcited', 'raisedExcitedNatural', 'sadFrownNatural', 'unibrowNatural', 'upDown', 'upDownNatural'];
const MOUTH_OPTIONS = ['concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad', 'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit'];
const CLOTHING_OPTIONS = ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'];
const CLOTHING_COLORS = ['262e33', '5199e4', '65c9ff', '7732a4', '929598', 'a7ca50', 'e6e6e6', 'ff5c5c', 'ffafb9', 'ffff00', '000000', 'ffffff', '4a4a4a', '1a365d', '22543d', '744210'];
const CUSTOM_ACCESSORIES = [
  { id: 'none', label: 'Nenhum' },
  { id: 'earring-hoop', label: 'Brinco Argola' },
  { id: 'earring-stud', label: 'Brinco Bolinha' },
  { id: 'piercing-nose-hoop', label: 'Piercing Nariz (Argola)' },
  { id: 'piercing-nose-stud', label: 'Piercing Nariz (Bolinha)' },
  { id: 'piercing-eyebrow', label: 'Piercing Sobrancelha' },
  { id: 'piercing-mouth', label: 'Piercing Boca' },
  { id: 'necklace', label: 'Colar' },
];

const OptionButton = React.memo(({ 
  category, 
  value, 
  label, 
  currentOptions, 
  onClick 
}: { 
  category: string, 
  value: string, 
  label?: string, 
  currentOptions: any,
  onClick: (category: any, value: string) => void 
}) => {
  const previewUrl = useMemo(() => {
    try {
      let customAccs = currentOptions.customAccessories || [];
      if (category === 'customAccessories') {
        if (value === 'none') {
          customAccs = ['none'];
        } else {
          customAccs = customAccs.includes(value) 
            ? customAccs.filter((a: string) => a !== value)
            : [...customAccs.filter((a: string) => a !== 'none'), value];
        }
      }

      const previewOptions = {
        ...(currentOptions as any),
        [category]: category === 'customAccessories' ? currentOptions[category] : [value],
        clothesColor: category === 'clothingColor' ? [value] : currentOptions.clothingColor,
        facialHairProbability: 100,
        accessoriesProbability: 100,
        size: 64,
      };
      
      const isEyepatch = previewOptions.accessories?.[0] === 'eyepatch';
      if (isEyepatch) {
        previewOptions.accessories = ['none'];
      }
      
      const avatar = createAvatar(avataaars, previewOptions as any);
      let svg = avatar.toString();

      const hairColorHex = previewOptions.hairColor?.[0] || '2c1b18';
      const styleTag = `<style>
        g[id^="Eyebrow"] path, g[id^="Eyebrow"] polygon { fill: #${hairColorHex} !important; fill-opacity: 1 !important; }
      </style>`;

      let accessoriesSvg = '';
      
      if (isEyepatch) {
        accessoriesSvg += `<g transform="translate(218 42) scale(-1, 1)"><path fill-rule="evenodd" clip-rule="evenodd" d="M94.4 4.78c-3.08-3.09-6.28 3.86-7.78 5.65-3.6 4.32-7.08 8.75-10.75 13.02-7.25 8.43-14.43 16.92-21.64 25.4-1.09 1.28-.96 1.41-2.4 1.54-.94.08-2.27-.4-3.26-.46-2.75-.16-5.46.3-8.13.9-5.35 1.17-11.01 3.1-15.65 6.07-1.22.78-2 1.7-3.32 1.94-1.15.21-2.68-.21-3.85-.32-2.08-.2-5.08-1.05-7.12-.6-2.6.55-3.58 3.7-.94 5.08 2.01 1.06 6.01.48 8.26.64 2.58.2 1.8.06 1.43 2.52-.53 3.54.35 7.49 1.84 10.72 3.46 7.5 13.03 15.46 21.77 14.72 7.28-.6 13.67-7.19 16.66-13.5a30.75 30.75 0 0 0 2.73-10.47c.19-2.27.08-4.67-.57-6.87a16.5 16.5 0 0 0-1.37-3.2c-.44-.79-2.4-2.64-2.52-3.44-.23-1.56 4.18-5.73 5.03-6.78 3.97-4.91 7.96-9.8 11.9-14.75 3.88-4.87 7.79-9.73 11.77-14.51 1.8-2.17 10.83-10.37 7.9-13.3" fill="#28354B"/></g>`;
      }

      if (customAccs.includes('earring-hoop')) {
        accessoriesSvg += `<circle cx="79" cy="130" r="8" fill="none" stroke="#FBBF24" stroke-width="3" />`;
        accessoriesSvg += `<circle cx="201" cy="130" r="8" fill="none" stroke="#FBBF24" stroke-width="3" />`;
      }
      if (customAccs.includes('earring-stud')) {
        accessoriesSvg += `<circle cx="79" cy="126" r="3" fill="#FBBF24" />`;
        accessoriesSvg += `<circle cx="201" cy="126" r="3" fill="#FBBF24" />`;
      }
      if (customAccs.includes('piercing-nose-hoop')) {
        accessoriesSvg += `<circle cx="144" cy="132" r="5" fill="none" stroke="#94A3B8" stroke-width="2" />`;
      }
      if (customAccs.includes('piercing-nose-stud')) {
        accessoriesSvg += `<circle cx="120" cy="130" r="2" fill="#E2E8F0" />`;
      }
      if (customAccs.includes('piercing-eyebrow')) {
        accessoriesSvg += `<circle cx="95" cy="100" r="2" fill="#E2E8F0" />`;
        accessoriesSvg += `<circle cx="100" cy="105" r="2" fill="#E2E8F0" />`;
      }
      if (customAccs.includes('piercing-mouth')) {
        accessoriesSvg += `<circle cx="140" cy="175" r="2" fill="#E2E8F0" />`;
      }
      if (customAccs.includes('necklace')) {
        accessoriesSvg += `<path d="M 110 200 Q 140 230 170 200" fill="none" stroke="#FBBF24" stroke-width="4" />`;
        accessoriesSvg += `<circle cx="140" cy="215" r="6" fill="#FBBF24" />`;
      }

      svg = svg.replace('</svg>', `${styleTag}${accessoriesSvg}</svg>`);
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    } catch (e) {
      return "";
    }
  }, [category, value, currentOptions]);

  const isActive = category === 'customAccessories' 
    ? (currentOptions.customAccessories || []).includes(value)
    : currentOptions[category]?.[0] === value;

  return (
    <button
      onClick={() => onClick(category, value)}
      className={`relative group flex flex-col items-center justify-center p-1 rounded-xl border-2 transition-all ${
        isActive 
          ? 'border-primary bg-primary/5 shadow-md scale-105' 
          : 'border-slate-100 hover:border-slate-200 bg-white'
      }`}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-50">
        <Image 
          src={previewUrl} 
          alt={value} 
          width={48}
          height={48}
          className="w-full h-full object-contain" 
          unoptimized
        />
      </div>
      {label && (
        <span className={`mt-1 text-[8px] font-bold truncate w-full px-1 text-center ${isActive ? 'text-primary' : 'text-slate-400'}`}>
          {label}
        </span>
      )}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
          <Check className="w-2 h-2" />
        </div>
      )}
    </button>
  );
});

OptionButton.displayName = 'OptionButton';

export default function AvatarCreator({ onSave, onClose, initialName, initialOptions }: AvatarCreatorProps) {
  const [options, setOptions] = useState(initialOptions || {
    top: [HAIR_OPTIONS[9]], // bigHair
    hairColor: [HAIR_COLORS[0]],
    facialHair: [FACIAL_HAIR_OPTIONS[0]],
    facialHairColor: [HAIR_COLORS[0]],
    accessories: [ACCESSORIES_OPTIONS[0]],
    skinColor: [SKIN_COLORS[3]],
    eyes: [EYE_OPTIONS[2]],
    eyebrows: [EYEBROW_OPTIONS[2]],
    mouth: [MOUTH_OPTIONS[1]],
    clothing: [CLOTHING_OPTIONS[3]],
    clothingColor: [CLOTHING_COLORS[1]],
    facialHairProbability: 100,
    accessoriesProbability: 100,
  });

  const avatarUrl = useMemo(() => {
    try {
      const avatarOptions = {
        ...(options as any),
        clothesColor: options.clothingColor,
        size: 200,
      };
      
      const isEyepatch = avatarOptions.accessories?.[0] === 'eyepatch';
      if (isEyepatch) {
        avatarOptions.accessories = ['none'];
      }

      const avatar = createAvatar(avataaars, avatarOptions);
      let svg = avatar.toString();

      // Change eyebrow color to match hair color
      const hairColorHex = options.hairColor?.[0] || '2c1b18';
      const styleTag = `<style>
        g[id^="Eyebrow"] path, g[id^="Eyebrow"] polygon { fill: #${hairColorHex} !important; fill-opacity: 1 !important; }
      </style>`;

      // Add custom accessories
      let accessoriesSvg = '';
      const customAccs = options.customAccessories || [];
      
      if (isEyepatch) {
        accessoriesSvg += `<g transform="translate(218 42) scale(-1, 1)"><path fill-rule="evenodd" clip-rule="evenodd" d="M94.4 4.78c-3.08-3.09-6.28 3.86-7.78 5.65-3.6 4.32-7.08 8.75-10.75 13.02-7.25 8.43-14.43 16.92-21.64 25.4-1.09 1.28-.96 1.41-2.4 1.54-.94.08-2.27-.4-3.26-.46-2.75-.16-5.46.3-8.13.9-5.35 1.17-11.01 3.1-15.65 6.07-1.22.78-2 1.7-3.32 1.94-1.15.21-2.68-.21-3.85-.32-2.08-.2-5.08-1.05-7.12-.6-2.6.55-3.58 3.7-.94 5.08 2.01 1.06 6.01.48 8.26.64 2.58.2 1.8.06 1.43 2.52-.53 3.54.35 7.49 1.84 10.72 3.46 7.5 13.03 15.46 21.77 14.72 7.28-.6 13.67-7.19 16.66-13.5a30.75 30.75 0 0 0 2.73-10.47c.19-2.27.08-4.67-.57-6.87a16.5 16.5 0 0 0-1.37-3.2c-.44-.79-2.4-2.64-2.52-3.44-.23-1.56 4.18-5.73 5.03-6.78 3.97-4.91 7.96-9.8 11.9-14.75 3.88-4.87 7.79-9.73 11.77-14.51 1.8-2.17 10.83-10.37 7.9-13.3" fill="#28354B"/></g>`;
      }

      if (customAccs.includes('earring-hoop')) {
        accessoriesSvg += `<circle cx="79" cy="130" r="8" fill="none" stroke="#FBBF24" stroke-width="3" />`;
        accessoriesSvg += `<circle cx="201" cy="130" r="8" fill="none" stroke="#FBBF24" stroke-width="3" />`;
      }
      if (customAccs.includes('earring-stud')) {
        accessoriesSvg += `<circle cx="79" cy="126" r="3" fill="#FBBF24" />`;
        accessoriesSvg += `<circle cx="201" cy="126" r="3" fill="#FBBF24" />`;
      }
      if (customAccs.includes('piercing-nose-hoop')) {
        accessoriesSvg += `<circle cx="144" cy="132" r="5" fill="none" stroke="#94A3B8" stroke-width="2" />`;
      }
      if (customAccs.includes('piercing-nose-stud')) {
        accessoriesSvg += `<circle cx="120" cy="130" r="2" fill="#E2E8F0" />`;
      }
      if (customAccs.includes('piercing-eyebrow')) {
        accessoriesSvg += `<circle cx="95" cy="100" r="2" fill="#E2E8F0" />`;
        accessoriesSvg += `<circle cx="100" cy="105" r="2" fill="#E2E8F0" />`;
      }
      if (customAccs.includes('piercing-mouth')) {
        accessoriesSvg += `<circle cx="140" cy="175" r="2" fill="#E2E8F0" />`;
      }
      if (customAccs.includes('necklace')) {
        accessoriesSvg += `<path d="M 110 200 Q 140 230 170 200" fill="none" stroke="#FBBF24" stroke-width="4" />`;
        accessoriesSvg += `<circle cx="140" cy="215" r="6" fill="#FBBF24" />`;
      }

      svg = svg.replace('</svg>', `${styleTag}${accessoriesSvg}</svg>`);
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    } catch (e) {
      console.error("Error creating avatar:", e);
      return "";
    }
  }, [options]);

  const updateOption = (key: keyof typeof options, value: string) => {
    setOptions((prev: any) => {
      if (key === 'customAccessories') {
        let customAccs = prev.customAccessories || [];
        if (value === 'none') {
          return { ...prev, customAccessories: ['none'] };
        } else {
          customAccs = customAccs.includes(value)
            ? customAccs.filter((a: string) => a !== value)
            : [...customAccs.filter((a: string) => a !== 'none'), value];
          return { ...prev, customAccessories: customAccs.length > 0 ? customAccs : ['none'] };
        }
      }
      return { ...prev, [key]: [value] };
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col md:flex-row"
      >
        {/* Preview Section */}
        <div className="w-full md:w-1/3 bg-slate-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200">
          <div className="relative group">
            <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-48 h-48 rounded-full bg-white shadow-xl border-4 border-white overflow-hidden">
              <Image 
                src={avatarUrl} 
                alt="Preview" 
                width={192}
                height={192}
                className="w-full h-full object-cover" 
                unoptimized
              />
            </div>
          </div>
          <h3 className="mt-6 text-xl font-black text-slate-900">{initialName}</h3>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mt-1">Personalizando Avatar</p>
          
          <button 
            onClick={() => {
              updateOption('top', HAIR_OPTIONS[Math.floor(Math.random() * HAIR_OPTIONS.length)]);
              updateOption('hairColor', HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)]);
              updateOption('facialHair', FACIAL_HAIR_OPTIONS[Math.floor(Math.random() * FACIAL_HAIR_OPTIONS.length)]);
              updateOption('facialHairColor', HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)]);
              updateOption('accessories', ACCESSORIES_OPTIONS[Math.floor(Math.random() * ACCESSORIES_OPTIONS.length)]);
              updateOption('skinColor', SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)]);
              updateOption('eyes', EYE_OPTIONS[Math.floor(Math.random() * EYE_OPTIONS.length)]);
              updateOption('eyebrows', EYEBROW_OPTIONS[Math.floor(Math.random() * EYEBROW_OPTIONS.length)]);
              updateOption('mouth', MOUTH_OPTIONS[Math.floor(Math.random() * MOUTH_OPTIONS.length)]);
              updateOption('clothing', CLOTHING_OPTIONS[Math.floor(Math.random() * CLOTHING_OPTIONS.length)]);
              updateOption('clothingColor', CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)]);
              
              if (Math.random() > 0.7) {
                const randomAcc = CUSTOM_ACCESSORIES[Math.floor(Math.random() * CUSTOM_ACCESSORIES.length)].id;
                updateOption('customAccessories', randomAcc);
              } else {
                updateOption('customAccessories', 'none');
              }
            }}
            className="mt-8 flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition-all shadow-sm"
          >
            <RefreshCw className="w-3 h-3" />
            Aleatório
          </button>
        </div>

        {/* Controls Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="text-lg font-black text-slate-900">Criador de Avatar</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Cabelo */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" />
                Cabelo e Estilo
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {HAIR_OPTIONS.map((opt) => (
                  <OptionButton 
                    key={opt} 
                    category="top" 
                    value={opt} 
                    currentOptions={options}
                    onClick={updateOption}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {HAIR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateOption('hairColor', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      options.hairColor[0] === color ? 'border-primary scale-110 shadow-lg' : 'border-white'
                    }`}
                    style={{ backgroundColor: `#${color}` }}
                  />
                ))}
              </div>
            </section>

            {/* Barba */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" />
                Barba e Bigode
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {FACIAL_HAIR_OPTIONS.map((opt) => (
                  <OptionButton 
                    key={opt} 
                    category="facialHair" 
                    value={opt} 
                    currentOptions={options}
                    onClick={updateOption}
                  />
                ))}
              </div>
              {options.facialHair[0] !== 'none' && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateOption('facialHairColor', color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        options.facialHairColor[0] === color ? 'border-primary scale-110 shadow-lg' : 'border-white'
                      }`}
                      style={{ backgroundColor: `#${color}` }}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Acessórios */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Eye className="w-3 h-3" />
                Óculos e Tapa-olho
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {ACCESSORIES_OPTIONS.map((opt) => (
                  <OptionButton 
                    key={opt} 
                    category="accessories" 
                    value={opt} 
                    currentOptions={options}
                    onClick={updateOption}
                  />
                ))}
              </div>
            </section>

            {/* Brincos e Piercings */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Eye className="w-3 h-3" />
                Brincos, Piercings e Colar
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {CUSTOM_ACCESSORIES.map((opt) => (
                  <OptionButton 
                    key={opt.id} 
                    category="customAccessories" 
                    value={opt.id} 
                    label={opt.label}
                    currentOptions={options}
                    onClick={updateOption}
                  />
                ))}
              </div>
            </section>

            {/* Pele */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Palette className="w-3 h-3" />
                Cor da Pele
              </h4>
              <div className="flex flex-wrap gap-3">
                {SKIN_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateOption('skinColor', color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      options.skinColor[0] === color ? 'border-primary scale-110 shadow-lg' : 'border-white'
                    }`}
                    style={{ backgroundColor: `#${color}` }}
                  />
                ))}
              </div>
            </section>

            {/* Rosto */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Eye className="w-3 h-3" />
                Olhos, Sobrancelhas e Boca
              </h4>
              <div className="space-y-6">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {EYE_OPTIONS.map((opt) => (
                    <OptionButton 
                      key={opt} 
                      category="eyes" 
                      value={opt} 
                      currentOptions={options}
                      onClick={updateOption}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {EYEBROW_OPTIONS.map((opt) => (
                    <OptionButton 
                      key={opt} 
                      category="eyebrows" 
                      value={opt} 
                      currentOptions={options}
                      onClick={updateOption}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {MOUTH_OPTIONS.map((opt) => (
                    <OptionButton 
                      key={opt} 
                      category="mouth" 
                      value={opt} 
                      currentOptions={options}
                      onClick={updateOption}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Roupa */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Shirt className="w-3 h-3" />
                Roupa
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {CLOTHING_OPTIONS.map((opt) => (
                  <OptionButton 
                    key={opt} 
                    category="clothing" 
                    value={opt} 
                    currentOptions={options}
                    onClick={updateOption}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {CLOTHING_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateOption('clothingColor', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      options.clothingColor[0] === color ? 'border-primary scale-110 shadow-lg' : 'border-white'
                    }`}
                    style={{ backgroundColor: `#${color}` }}
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl font-bold transition-all border border-slate-200"
            >
              Cancelar
            </button>
            <button 
              onClick={() => onSave(avatarUrl, options)}
              className="flex-[2] px-6 py-3 bg-primary text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Salvar Avatar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}