import React from 'react';
import { GameSettings, GameDifficulty } from '../types';
import { X, Sliders, Volume2, Mic, Eye, Keyboard, HelpCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-950 border-b border-emerald-800/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-emerald-200">功能设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 text-sm">
          {/* Difficulty Level */}
          <div>
            <label className="font-bold text-slate-200 block mb-2 flex items-center justify-between">
              <span>难度等级与河水流速</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                {settings.difficulty === 'easy'
                  ? '轻松探索 (不沉没)'
                  : settings.difficulty === 'normal'
                  ? '经典适中 (原版手速)'
                  : '极速挑战 (快速漂移)'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'normal', 'hard'] as GameDifficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => onUpdateSettings({ difficulty: diff })}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border transition cursor-pointer text-center ${
                    settings.difficulty === diff
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {diff === 'easy' && '🌱 轻松初级'}
                  {diff === 'normal' && '🌊 经典标准'}
                  {diff === 'hard' && '⚡ 极速进阶'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              初学者小朋友建议选择“轻松初级”，荷叶漂动缓慢且不会沉没，让孩子从容找键！
            </p>
          </div>

          {/* Frogs per Round */}
          <div>
            <label className="font-bold text-slate-200 block mb-2">每轮过河青蛙数量</label>
            <div className="flex gap-3">
              {[3, 5, 8].map((count) => (
                <button
                  key={count}
                  onClick={() => onUpdateSettings({ totalFrogsPerRound: count })}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs border transition cursor-pointer ${
                    settings.totalFrogsPerRound === count
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  🐸 {count} 只青蛙
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Speech Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            {/* SFX Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">游戏音效 (按键音/落水/过河欢呼)</span>
              </div>
              <input
                type="checkbox"
                checked={settings.sfxEnabled}
                onChange={(e) => onUpdateSettings({ sfxEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* TTS Speech Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-teal-400" />
                <div>
                  <span className="font-semibold text-slate-200">纯正英文发音 (朗读荷叶单词)</span>
                  <p className="text-[11px] text-slate-400">青蛙跳跃落位时朗读，音形结合学英语</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.ttsEnabled}
                onChange={(e) => onUpdateSettings({ ttsEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Chinese Definition Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="font-semibold text-slate-200">显示中文释义气泡</span>
                  <p className="text-[11px] text-slate-400">在荷叶单词下方展示对应汉字词义</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showChinesePrompt}
                onChange={(e) => onUpdateSettings({ showChinesePrompt: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Virtual Keyboard Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="font-semibold text-slate-200">儿童指法小键盘</span>
                  <p className="text-[11px] text-slate-400">高亮当前所需键位及手指色彩分工</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showVirtualKeyboard}
                onChange={(e) => onUpdateSettings({ showVirtualKeyboard: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={onResetDefaults}
            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            恢复默认设置
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
