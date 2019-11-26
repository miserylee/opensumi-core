import { Injectable, Autowired } from '@ali/common-di';
import { CommandContribution, CommandRegistry, Command, CommandService } from '@ali/ide-core-common/lib/command';
import { Domain, IEventBus, ContributionProvider, Event } from '@ali/ide-core-common';
import { IContextKeyService, ClientAppContribution, SlotLocation, SlotRendererContribution, SlotRendererRegistry, slotRendererRegistry } from '@ali/ide-core-browser';
import { IMainLayoutService } from '../common';
import { ComponentContribution, ComponentRegistry, VisibleChangedEvent, TabBarToolbarContribution, ToolbarRegistry } from '@ali/ide-core-browser/lib/layout';
import { LayoutState } from '@ali/ide-core-browser/lib/layout/layout-state';
import { RightTabRenderer, LeftTabRenderer, BottomTabRenderer } from './tabbar/renderer.view';
import { IStatusBarService } from '@ali/ide-status-bar';
import { getIcon } from '@ali/ide-core-browser';
import { StatusBarAlignment } from '@ali/ide-core-browser/lib/services';

// NOTE 左右侧面板的展开、折叠命令请使用组合命令 activity-bar.left.toggle，layout命令仅做折叠展开，不处理tab激活逻辑
export const HIDE_LEFT_PANEL_COMMAND: Command = {
  id: 'main-layout.left-panel.hide',
};
export const SHOW_LEFT_PANEL_COMMAND: Command = {
  id: 'main-layout.left-panel.show',
};
export const TOGGLE_LEFT_PANEL_COMMAND: Command = {
  id: 'main-layout.left-panel.toggle',
};
export const HIDE_RIGHT_PANEL_COMMAND: Command = {
  id: 'main-layout.right-panel.hide',
};
export const SHOW_RIGHT_PANEL_COMMAND: Command = {
  id: 'main-layout.right-panel.show',
};
export const TOGGLE_RIGHT_PANEL_COMMAND: Command = {
  id: 'main-layout.right-panel.toggle',
};

export const HIDE_BOTTOM_PANEL_COMMAND: Command = {
  id: 'main-layout.bottom-panel.hide',
};
export const SHOW_BOTTOM_PANEL_COMMAND: Command = {
  id: 'main-layout.bottom-panel.show',
};
export const TOGGLE_BOTTOM_PANEL_COMMAND: Command = {
  id: 'main-layout.bottom-panel.toggle',
};
export const IS_VISIBLE_BOTTOM_PANEL_COMMAND: Command = {
  id: 'main-layout.bottom-panel.is-visible',
};
export const SET_PANEL_SIZE_COMMAND: Command = {
  id: 'main-layout.panel.size.set',
};

@Domain(CommandContribution, ClientAppContribution, SlotRendererContribution)
export class MainLayoutModuleContribution implements CommandContribution, ClientAppContribution, SlotRendererContribution {

  @Autowired(IMainLayoutService)
  private mainLayoutService: IMainLayoutService;

  @Autowired(IContextKeyService)
  contextKeyService: IContextKeyService;

  @Autowired(IEventBus)
  eventBus: IEventBus;

  @Autowired(ComponentContribution)
  contributionProvider: ContributionProvider<ComponentContribution>;

  @Autowired(SlotRendererContribution)
  rendererContributionProvider: ContributionProvider<SlotRendererContribution>;

  @Autowired(ComponentRegistry)
  componentRegistry: ComponentRegistry;

  @Autowired(IStatusBarService)
  statusBar: IStatusBarService;

  @Autowired(CommandService)
  private commandService!: CommandService;

  @Autowired()
  private layoutState: LayoutState;

  @Autowired(TabBarToolbarContribution)
  protected readonly toolBarContributionProvider: ContributionProvider<TabBarToolbarContribution>;

  @Autowired()
  private toolBarRegistry: ToolbarRegistry;

  async onStart() {
    this.statusBar.addElement('bottom-panel-handle', {
      iconClass: getIcon('window-maximize'),
      alignment: StatusBarAlignment.RIGHT,
      command: 'main-layout.bottom-panel.toggle',
    });
    const componentContributions = this.contributionProvider.getContributions();
    for (const contribution of componentContributions) {
      contribution.registerComponent(this.componentRegistry);
    }
    const rendererContributions = this.rendererContributionProvider.getContributions();
    for (const contribution of rendererContributions) {
      contribution.registerRenderer(slotRendererRegistry);
    }
    const contributions = this.toolBarContributionProvider.getContributions();
    for (const contribution of contributions) {
      contribution.registerToolbarItems(this.toolBarRegistry);
    }
    // 全局只要初始化一次
    await this.layoutState.initStorage();
  }

  registerRenderer(registry: SlotRendererRegistry) {
    registry.registerSlotRenderer('right', RightTabRenderer);
    registry.registerSlotRenderer('left', LeftTabRenderer);
    registry.registerSlotRenderer('bottom', BottomTabRenderer);
  }

  registerCommands(commands: CommandRegistry): void {
    // @deprecated
    commands.registerCommand(HIDE_LEFT_PANEL_COMMAND, {
      execute: () => {
        this.mainLayoutService.toggleSlot(SlotLocation.left, false);
      },
    });
    // @deprecated
    commands.registerCommand(SHOW_LEFT_PANEL_COMMAND, {
      execute: (size?: number) => {
        this.mainLayoutService.toggleSlot(SlotLocation.left, true, size);
      },
    });
    commands.registerCommand(TOGGLE_LEFT_PANEL_COMMAND, {
      execute: (show?: boolean, size?: number) => {
        this.mainLayoutService.toggleSlot(SlotLocation.left, show, size);
      },
    });

    // @deprecated
    commands.registerCommand(HIDE_RIGHT_PANEL_COMMAND, {
      execute: () => {
        this.mainLayoutService.toggleSlot(SlotLocation.right, false);
      },
    });
    // @deprecated
    commands.registerCommand(SHOW_RIGHT_PANEL_COMMAND, {
      execute: (size?: number) => {
        this.mainLayoutService.toggleSlot(SlotLocation.right, true, size);
      },
    });
    commands.registerCommand(TOGGLE_RIGHT_PANEL_COMMAND, {
      execute: (show?: boolean, size?: number) => {
        this.mainLayoutService.toggleSlot(SlotLocation.right, show, size);
      },
    });

    // @deprecated
    commands.registerCommand(SHOW_BOTTOM_PANEL_COMMAND, {
      execute: () => {
        this.mainLayoutService.toggleSlot(SlotLocation.bottom, true);
      },
    });
    // @deprecated
    commands.registerCommand(HIDE_BOTTOM_PANEL_COMMAND, {
      execute: () => {
        this.mainLayoutService.toggleSlot(SlotLocation.bottom, false);
      },
    });
    commands.registerCommand(TOGGLE_BOTTOM_PANEL_COMMAND, {
      execute: (show?: boolean, size?: number) => {
        this.mainLayoutService.toggleSlot(SlotLocation.bottom, show, size);
      },
    });
    commands.registerCommand(IS_VISIBLE_BOTTOM_PANEL_COMMAND, {
      execute: () => {
        return this.mainLayoutService.getTabbarService('bottom').currentContainerId !== '';
      },
    });
    commands.registerCommand(SET_PANEL_SIZE_COMMAND, {
      execute: (size: number) => {
        this.mainLayoutService.setFloatSize(size);
      },
    });
  }
}
