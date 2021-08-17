import { ExtHostEnv, createEnvApiFactory } from '@ali/ide-kaitian-extension/lib/hosted/api/vscode/ext.host.env';
import { Emitter, ILoggerManagerClient, Uri, uuid } from '@ali/ide-core-common';
import { MainThreadAPIIdentifier, ExtHostAPIIdentifier } from '@ali/ide-kaitian-extension/lib/common/vscode';
import { RPCProtocol, WSChannelHandler } from '@ali/ide-connection';
import { MainThreadEnv } from '@ali/ide-kaitian-extension/lib/browser/vscode/api/main.thread.env';
import { createBrowserInjector } from '../../../../../../tools/dev-tool/src/injector-helper';
import { mockService } from '../../../../../../tools/dev-tool/src/mock-injector';
import { MockLoggerManagerClient } from '../../../../__mocks__/loggermanager';
import { UIKind } from '@ali/ide-kaitian-extension/lib/common/vscode/ext-types';

import type * as vscode from 'vscode';

const emitterA = new Emitter<any>();
const emitterB = new Emitter<any>();

const mockClientA = {
  send: (msg) => emitterB.fire(msg),
  onMessage: emitterA.event,
};
const mockClientB = {
  send: (msg) => emitterA.fire(msg),
  onMessage: emitterB.event,
};

const rpcProtocolExt = new RPCProtocol(mockClientA);
const rpcProtocolMain = new RPCProtocol(mockClientB);

let extHost: ExtHostEnv;
let mainThread: MainThreadEnv;

describe('vscode extHostEnv Test', () => {
  const injector = createBrowserInjector([]);
  injector.addProviders({
    token: ILoggerManagerClient,
    useClass: MockLoggerManagerClient,
  }, {
    token: WSChannelHandler,
    useValue: mockService({
      clientId: uuid(),
    }),
  });
  const extensionService = mockService({});
  const extHostTerminal = mockService({
    shellPath: 'shellPath',
  });
  let env: typeof vscode.env;
  extHost = new ExtHostEnv(rpcProtocolExt);
  rpcProtocolExt.set(ExtHostAPIIdentifier.ExtHostEnv, extHost);

  mainThread = rpcProtocolMain.set(MainThreadAPIIdentifier.MainThreadEnv, injector.get(MainThreadEnv, [rpcProtocolMain]));

  beforeEach(() => {
    env = createEnvApiFactory(rpcProtocolExt, extensionService, extHost, extHostTerminal);
  });

  afterAll(() => {
    mainThread.dispose();
  });

  it('env is set', () => {
    expect(typeof env.language).toBe('string');
    expect(typeof env.appRoot).toBe('string');
    expect(typeof env.appName).toBe('string');
    expect(typeof env.machineId).toBe('string');
    expect(typeof env.sessionId).toBe('string');
    expect(typeof env.shell).toBe('string');
  });

  it('env is readonly', () => {
    // 加上 any 防止 ts 静态检测
    expect(() => (env as any).language = '234').toThrowError();
    expect(() => (env as any).appRoot = '234').toThrowError();
    expect(() => (env as any).appName = '234').toThrowError();
    expect(() => (env as any).machineId = '234').toThrowError();
    expect(() => (env as any).sessionId = '234').toThrowError();
  });

  it('get uiKind', () => {
    expect(env.uiKind).toBe(UIKind.Web);
  });

  describe('asExternalUrl', () => {
    const oldWindowLocationHostname = window.location.hostname;
    const oldWindowLocationHref = window.location.href;
    const ideHostName = 'ide.aliababa.com';
    const ideUrl = `https://${ideHostName}/workspace?id=1`;
    beforeAll(() => {
      Object.defineProperty(window, 'location', {
        value: {
          href: ideUrl,
          hostname: ideHostName,
        },
      });
    });

    afterAll(() => {
      Object.defineProperty(window, 'location', {
        value: {
          href: oldWindowLocationHref,
          hostname: oldWindowLocationHostname,
        },
      });
    });

    it('asExternalUri localhost uri', async () => {
      const uri = Uri.parse('http://localhost:8080?userId=1');
      const externalUri = await env.asExternalUri(uri);
      expect(externalUri.scheme).toBe('https');
      expect(externalUri.authority).toBe('ide.aliababa.com:8080');
      expect(externalUri.path.toString()).toBe('/');
      expect(externalUri.query).toBe('userId=1');
      expect(externalUri.toString(true)).toBe('https://ide.aliababa.com:8080/?userId=1');
    });

    it('asExternalUri remote uri', async () => {
      const uri = Uri.parse('https://ide.antfin-inc.com/workspaces/5fb21cc29b67dcd76a27272f');
      const externalUri = await env.asExternalUri(uri);
      expect(externalUri.scheme).toBe('https');
      expect(externalUri.authority).toBe('ide.antfin-inc.com');
      expect(externalUri.path.toString()).toBe('/workspaces/5fb21cc29b67dcd76a27272f');
      expect(externalUri.toString(true)).toBe('https://ide.antfin-inc.com/workspaces/5fb21cc29b67dcd76a27272f');
    });

    it('asExternalUri appUriScheme', async () => {
      const uri = Uri.parse(`${env.uriScheme}://my.extension/did-authenticate?userId=1`);
      const externalUri = await env.asExternalUri(uri);
      expect(externalUri.scheme).toBe(env.uriScheme);
      expect(externalUri.authority).toBe('my.extension');
      expect(externalUri.path.toString()).toBe('/did-authenticate');
      const query = new URLSearchParams(externalUri.query);
      expect(query.get('userId')).toBe('1');
      expect(query.get('windowId')).toBeTruthy();
    });
  });

});
