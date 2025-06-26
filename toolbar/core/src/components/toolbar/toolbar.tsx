// This component represents the box in which the toolbar is placed.
// It is only used in desktop cases, since the mobile toolbar is placed inside a modal card.

import { Button } from '@headlessui/react';
import {
  RefreshCwIcon,
  WifiOffIcon,
  SettingsIcon,
  PuzzleIcon,
  MessageCircleIcon,
  XIcon,
} from 'lucide-react';
import { ToolbarChatArea } from './panels/chat-box';
import { useEffect, useState } from 'preact/hooks';
import { ToolbarSection } from './section';
import { ToolbarButton } from './button';
import { useChatState } from '@/hooks/use-chat-state';
import { cn } from '@/utils';
import { useAppState } from '@/hooks/use-app-state';
import { Logo } from '@/components/ui/logo';
import type { VNode } from 'preact';
import { SettingsPanel } from './settings';
import { useVSCode } from '@/hooks/use-vscode';
import { DisconnectedStatePanel } from './panels/disconnected-state';
import { ConnectingStatePanel } from './panels/connecting-state';
import { WindowSelectionPanel } from './panels/window-selection';
import { NormalStateButtons } from './contents/normal';
import { DisconnectedStateButtons } from './contents/disconnected';
import { usePlugins } from '@/hooks/use-plugins';

export function ToolbarBox() {
  const {
    windows,
    isDiscovering,
    discoveryError,
    discover,
    shouldPromptWindowSelection,
  } = useVSCode();
  const isConnected = windows.length > 0;
  const { plugins } = usePlugins();

  const [pluginBox, setPluginBox] = useState<null | {
    component: VNode;
    pluginName: string;
  }>(null);
  const [openPanel, setOpenPanel] = useState<
    null | 'settings' | { pluginName: string; component: VNode }
  >(null);

  // Добавляем дебаунс для состояния загрузки и отключения
  const [debouncedDiscovering, setDebouncedDiscovering] = useState(false);
  const [debouncedDisconnected, setDebouncedDisconnected] = useState(false);

  const chatState = useChatState();

  const { minimized, minimize, expand, position } = useAppState();

  useEffect(() => {
    if (minimized) {
      setPluginBox(null);
      setOpenPanel(null);
    }
  }, [minimized]);

  // Дебаунс для isDiscovering - показываем состояние загрузки только если оно длится больше 500ms
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isDiscovering) {
      timeoutId = setTimeout(() => {
        setDebouncedDiscovering(true);
      }, 500);
    } else {
      setDebouncedDiscovering(false);
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [isDiscovering]);

  // Дебаунс для disconnected состояния - показываем отключение только если оно длится больше 1000ms
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const actuallyDisconnected = !isConnected && !isDiscovering;

    if (actuallyDisconnected) {
      timeoutId = setTimeout(() => {
        setDebouncedDisconnected(true);
      }, 1000);
    } else {
      setDebouncedDisconnected(false);
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [isConnected, isDiscovering]);

  // Убираем автоматическое включение режима чата при разворачивании
  // Теперь чат включается только через хоткей Option+Period

  // Create a wrapper function to handle button clicks
  const handleButtonClick = (handler: () => void) => (e: MouseEvent) => {
    handler();
  };

  // Determine which theme and content to show
  const isLoadingState = debouncedDiscovering;
  const isDisconnectedState = debouncedDisconnected;
  const isConnectedState = isConnected;
  const shouldShowWindowSelection =
    shouldPromptWindowSelection && isConnectedState;

  // Theme classes based on state
  const getThemeClasses = () => {
    if (isLoadingState) {
      return {
        border: 'border-blue-300',
        bg: 'bg-blue-100/80',
        divideBorder: 'divide-blue-200',
        buttonBg: 'bg-blue-600',
        buttonColor: 'text-blue-700',
      };
    }
    if (isDisconnectedState) {
      return {
        border: 'border-orange-300',
        bg: 'bg-orange-100/80',
        divideBorder: 'divide-orange-200',
        buttonBg: 'bg-orange-600',
        buttonColor: 'text-orange-700',
      };
    }
    // Connected state (default)
    return {
      border: 'border-border/30',
      bg: 'bg-zinc-50/80',
      divideBorder: 'divide-border/20',
      buttonBg: 'bg-zinc-950', // Чисто черный фон
      buttonColor: 'stroke-zinc-950',
    };
  };

  const theme = getThemeClasses();

  // Get the appropriate icon for the minimized state
  const getMinimizedIcon = () => {
    // Показываем спиннер если идет переподключение (даже без дебаунса для мгновенной реакции)
    if (isDiscovering) {
      return <RefreshCwIcon className="size-5 animate-spin text-white" />;
    }
    // Показываем иконку отключения если не подключены
    if (isDisconnectedState) {
      return <WifiOffIcon className="size-5 text-white" />;
    }
    // По умолчанию показываем логотип
    return <Logo className="size-5" color="white" />;
  };

  // Получаем CSS классы для позиции
  const getPositionClasses = () => {
    switch (position) {
      case 'bottomLeft':
        return 'bottom-4 left-4';
      case 'bottomRight':
        return 'bottom-4 right-4';
      case 'topLeft':
        return 'top-4 left-4';
      case 'topRight':
        return 'top-4 right-4';
      default:
        return 'bottom-4 left-4';
    }
  };

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      {/* Центрированный чат снизу с отступом */}
      {isConnectedState && !minimized && (
        <div className="-translate-x-1/2 fixed bottom-24 left-1/2 z-40">
          <div
            className={cn(
              'w-[400px] max-w-[80vw] transition-all duration-300 ease-out', // Увеличиваем ширину
              chatState.isPromptCreationActive
                ? 'pointer-events-auto scale-100 opacity-100 blur-none'
                : 'pointer-events-none scale-95 opacity-0 blur-md', // Менее навязчивое масштабирование
            )}
          >
            <div className="flex flex-col gap-2">
              <ToolbarChatArea />
              {/* Settings and plugins buttons under chat */}
              <div className="flex justify-center gap-2">
                {/* Plugin buttons */}
                {plugins
                  .filter((plugin) => plugin.onActionClick)
                  .map((plugin) => (
                    <ToolbarButton
                      key={plugin.pluginName}
                      onClick={handleButtonClick(() => {
                        if (pluginBox?.pluginName !== plugin.pluginName) {
                          const component = plugin.onActionClick();
                          if (component) {
                            setPluginBox({
                              component: plugin.onActionClick(),
                              pluginName: plugin.pluginName,
                            });
                          }
                        } else {
                          setPluginBox(null);
                        }
                      })}
                      active={pluginBox?.pluginName === plugin.pluginName}
                      className="opacity-60 transition-opacity hover:opacity-100"
                    >
                      {plugin.iconSvg ? (
                        <span className="size-4 stroke-zinc-950 text-zinc-950 *:size-full">
                          {plugin.iconSvg}
                        </span>
                      ) : (
                        <PuzzleIcon className="size-4" />
                      )}
                    </ToolbarButton>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plugin box / info panel рядом с кнопкой */}
      {(pluginBox ||
        openPanel === 'settings' ||
        (!isConnectedState && !minimized) || // Показываем состояния отключения только в развернутом виде
        (shouldShowWindowSelection && !minimized)) && // Показываем выбор окна только в развернутом виде
        !minimized && (
          <div
            className={cn(
              'absolute w-[480px] max-w-[40vw] transition-all duration-300 ease-out',
              // Позиционирование панели настроек в зависимости от положения тулбара
              openPanel === 'settings'
                ? position.includes('top')
                  ? 'top-full mt-12'
                  : 'bottom-full mb-12'
                : position.includes('top')
                  ? 'top-full mt-2'
                  : 'bottom-full mb-2',
              // Сдвиг на ширину панели когда тулбар справа
              position.includes('Right')
                ? 'right-0' // Сдвигаем панель влево на (ширина_панели - ширина_тулбара)
                : 'left-0', // Левый край панели = левый край тулбара
            )}
          >
            {/* Render content based on state */}
            {isLoadingState && <ConnectingStatePanel />}
            {isDisconnectedState && (
              <DisconnectedStatePanel
                discover={discover}
                discoveryError={discoveryError}
              />
            )}
            {shouldShowWindowSelection && <WindowSelectionPanel />}
            {isConnectedState &&
              openPanel === 'settings' &&
              !shouldShowWindowSelection && (
                <SettingsPanel onClose={() => setOpenPanel(null)} />
              )}
            {isConnectedState &&
              !shouldShowWindowSelection &&
              pluginBox?.component}
          </div>
        )}

      {/* Кнопка настроек над/под логотипом */}
      {isConnectedState && !minimized && chatState.isPromptCreationActive && (
        <div
          className={cn(
            'absolute transition-all duration-300 ease-out',
            // Позиционирование кнопки настроек в зависимости от положения тулбара
            position.includes('top') ? 'top-full mt-1' : 'bottom-full mb-1',
            '-translate-x-1/2 left-1/2',
          )}
        >
          <Button
            onClick={handleButtonClick(() => {
              // Простая логика - переключаем настройки
              setOpenPanel(openPanel === 'settings' ? null : 'settings');
            })}
            className={cn(
              'pointer-events-auto flex size-8 items-center justify-center rounded-full bg-white p-1 text-zinc-950 transition-all duration-150 hover:bg-zinc-500/5',
              openPanel === 'settings' && 'bg-white/40 ring ring-zinc-950/20',
            )}
          >
            <SettingsIcon className="size-4" />
          </Button>
        </div>
      )}

      {/* Главная кнопка */}
      <Button
        onClick={handleButtonClick(() => {
          if (chatState.isPromptCreationActive) {
            chatState.stopPromptCreation();
          } else if (minimized) {
            expand();
            setTimeout(() => chatState.startPromptCreation(), 100);
          } else {
            chatState.startPromptCreation();
          }
        })}
        className={cn(
          'pointer-events-auto relative z-50 flex size-10 cursor-pointer items-center justify-center rounded-full border shadow-md backdrop-blur transition-all duration-300 ease-out',
          theme.border,
          theme.bg,
          theme.buttonBg,
        )}
      >
        {/* Лого с анимацией блюра */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out',
            chatState.isPromptCreationActive
              ? 'pointer-events-none scale-95 opacity-0 blur-sm'
              : 'pointer-events-auto scale-100 opacity-100 blur-none',
          )}
        >
          {getMinimizedIcon()}
        </div>

        {/* Крестик с анимацией блюра */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out',
            chatState.isPromptCreationActive
              ? 'pointer-events-auto scale-100 opacity-100 blur-none'
              : 'pointer-events-none scale-95 opacity-0 blur-sm',
          )}
        >
          <XIcon className="h-5 min-h-5 w-5 min-w-5 text-white" />
        </div>
      </Button>
    </div>
  );
}
