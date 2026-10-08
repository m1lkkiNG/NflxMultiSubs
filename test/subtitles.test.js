const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const utils = require('../src/subtitle-utils');
const defaults = require('../src/default-settings');
const track = (language = 'en', modern = true) => ({
  language, languageDescription: language, hydrated: true,
  [modern ? 'id' : 'new_track_id']: `T;${language};0;0;0`,
  [modern ? 'downloadables' : 'ttDownloadables']: {
    'dfxp-ls-sdh': { downloadUrls: { a: 'https://example.test/a' } },
  },
});
function harness() {
  const dom = new JSDOM('<div id="appMountPoint"><div data-uia="video-canvas"><video></video></div></div>', {
    url: 'https://www.netflix.com/watch/1', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const context = dom.getInternalVMContext();
  const records = [];
  Object.assign(context, {
    VERSION: 'test', BROWSER: 'safari',
    require: name => name === './playback-rate-controller' ? vm.runInContext('(function(){const module={exports:{}};'+fs.readFileSync(path.resolve(__dirname, '../src/playback-rate-controller.js'),'utf8')+';return module.exports;})()', context) : name === './console' ? { log() {}, debug() {}, warn() {}, error() {} } :
      name === './diagnostics' ? { record: (stage, data) => records.push({stage, ...data}), snapshot: () => records } :
        require(name.startsWith('./') ? path.resolve(__dirname, '../src', name) : name),
    fetch: async () => new Response('<tt><body><div><p begin="10000000t" end="30000000t">Hello<br/>世界</p></div></body></tt>'),
    AbortSignal,
  });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../src/nflxmultisubs.js'), 'utf8') + `\nwindow.testAPI = {
    TextSubtitle, ImageSubtitle, SubtitleFactory, SubtitleMenu, RendererLoop, buildSubtitleList, updateSubtitleList, activateSubtitle,
    manager: nflxMultiSubsManager, setSubs: s => gSubtitles = s, getSubs: () => gSubtitles,
    options: gRenderOptions, getLoop: () => gRendererLoop,
  };`, context);
  return { dom, context, api: dom.window.testAPI, records, close: () => dom.window.close() };
}
test('both manifest schemas, absent track arrays, mixed downloadable URL shapes', () => {
  assert.deepEqual(utils.getTextTracks({textTracks: [1]}), [1]);
  assert.deepEqual(utils.getTextTracks({timedtexttracks: [2]}), [2]);
  assert.deepEqual(utils.getTextTracks({}), []);
  assert.deepEqual(utils.getUrls({urls: [{url: 'https://a.test'}, 'https://b.test', null, 'javascript:bad']}), ['https://a.test','https://b.test']);
});
test('TTML supports Netflix ticks, tickRate, clock, seconds and milliseconds', () => {
  for (const [input, expected] of [['10000000t',1], ['00:01:02.500',62.5], ['250ms',0.25], ['2s',2]]) assert.equal(utils.ttmlTime(input),expected);
  assert.equal(utils.ttmlTime('24t',24),1);
  assert.ok(Number.isNaN(utils.ttmlTime('bad')));
});
test('GET fallback retries HTTP errors and malformed data; no HEAD dependency', async () => {
  let calls = 0;
  await utils.downloadWithFallback(['a','b','c'], async response => { if (await (await response).text() === 'invalid') throw Error(); }, async (_, options) => {
    assert.equal(options.method, undefined);
    assert.equal(options.credentials,'omit');
    return ++calls === 1 ? new Response('',{status:403}) : new Response(calls === 2 ? 'invalid' : 'valid');
  });
  assert.equal(calls,3);
  await assert.rejects(utils.downloadWithFallback(['secret?token=secret'], () => {}, async () => { throw Error('secret'); }), /^Error: SUBTITLE_DOWNLOAD_OR_PARSE_FAILED$/);
});
test('MAIN world starts with no extension APIs and JSON hook cannot break Netflix parsing', () => {
  const h = harness();
  try {
    assert.ok(h.records.some(r => r.stage === 'PAGE_HOOK_READY'));
    const result = h.dom.window.JSON.parse('{"result":{"movieId":1}}');
    assert.equal(result.result.movieId,1);
    assert.ok(h.records.some(r => r.stage === 'MANIFEST_TRACK_FIELDS_MISSING'));
    assert.throws(() => h.dom.window.JSON.parse('{'));
  } finally { h.close(); }
});
test('new and old tracks build; missing hydrated flag with URLs works; malformed tracks do not empty the list', () => {
  const h=harness();
  try {
    const noFlag=track('zh'); delete noFlag.hydrated;
    const subs=h.api.buildSubtitleList([track(),track('fr',false),noFlag,null,{language:'xx',hydrated:true}]);
    assert.equal(subs.filter(s=>s.urls?.length).length,3);
    h.api.setSubs(subs);
    assert.doesNotThrow(()=>h.api.updateSubtitleList(undefined));
    assert.doesNotThrow(()=>h.api.updateSubtitleList([track('de')]));
    assert.ok(h.api.getSubs().some(s=>s.bcp47==='de'));
  } finally { h.close(); }
});
test('download errors settle, selection can retry, READY reactivation settles, cues follow seeks', async () => {
  const h=harness();
  try {
    const sub = new h.api.TextSubtitle('English','en',['https://example.test']);
    let tries=0; sub._download=async()=>{ if (++tries===1) throw Error(); sub.lines=[{id:0,begin:1,end:3,text:'Hello'}]; };
    await assert.rejects(sub.activate()); assert.equal(sub.state,'ERROR');
    await sub.activate(); assert.equal(sub.state,'READY');
    await sub.activate(); assert.equal(tries,2);
    sub.setExtent(1920,1080);
    assert.equal(sub.render(2,defaults,true)[0].textContent,'Hello');
    assert.equal(sub.render(5,defaults,true)[0].textContent,'');
    assert.equal(sub.render(2,defaults,true)[0].textContent,'Hello');
    const parsed = new h.api.TextSubtitle('English','en',[]);
    await parsed._extract(Promise.resolve(new Response('<tt><body><div><p begin="1s" end="3s">Hello<br/>世界</p></div></body></tt>')));
    assert.equal(parsed.lines[0].text,'Hello\n世界');
    await assert.rejects(parsed._extract(Promise.resolve(new Response('<html>error</html>'))));
  } finally { h.close(); }
});
test('menu accepts multiple CSS classes and refreshes language list', () => {
  const h=harness();
  try {
    const node=h.dom.window.document.createElement('div');
    node.innerHTML='<div data-uia="selector-audio-subtitle"><div class="one two"><h3></h3><ul class="a b"><li class="c d"><div><div></div></div></li></ul></div></div>';
    h.api.setSubs(h.api.buildSubtitleList([track(),track('zh')]));
    const menu=new h.api.SubtitleMenu(node); menu.render();
    assert.equal(menu.elem.querySelectorAll('li').length,3);
  } finally {h.close();}
});
test('off clears old subtitle; primary DOM without font style does not stop rendering', () => {
  const h=harness();
  try {
    const video=h.dom.window.document.querySelector('video');
    const loop=new h.api.RendererLoop(video); loop._appendSubtitleWrapper();
    loop.subSvg=loop.subtitleWrapperElem.querySelector('svg'); loop.subSvg.innerHTML='<text>stale</text>';
    h.api.setSubs(h.api.buildSubtitleList([])); loop._renderSecondarySubtitles();
    assert.equal(loop.subSvg.children.length,0);
  } finally {h.close();}
});
test('stale async activation cannot replace next episode, missing audio is tolerated', async () => {
  const h=harness();
  try {
    const manager=h.api.manager;
    let resolve;
    manager.busyWaitVideoElement=()=>new Promise(r=>resolve=r);
    manager.updateManifest({movieId:1,textTracks:[track()]});
    h.dom.window.history.replaceState(null,'','/watch/2');
    resolve(h.dom.window.document.querySelector('video'));
    await new Promise(r=>setTimeout(r,0));
    assert.equal(manager.lastMovieId,undefined);
    manager.busyWaitVideoElement=async()=>h.dom.window.document.querySelector('video');
    manager.updateManifest({movieId:2,textTracks:[track('zh')]});
    await new Promise(r=>setTimeout(r,0));
    assert.equal(manager.lastMovieId,2);
    assert.ok(h.api.getSubs().some(s=>s.bcp47==='zh'));
  } finally {h.close();}
});
test('image ZIP parser rejects missing images and accepts valid TTML geometry', async () => {
  const h=harness();
  try {
    const JSZip=require('jszip');
    const zip=new JSZip();
    zip.file('manifest_ttml2.xml','<tt xmlns:tts="http://www.w3.org/ns/ttml#styling" tts:extent="1920 1080"><body><div tts:extent="100 30" tts:origin="20 40" begin="00:00:01.000" end="00:00:03.000"><image src="cue.png"/></div></body></tt>');
    const sub=new h.api.ImageSubtitle('中文','zh',[]);
    await assert.rejects(sub._extract(Promise.resolve(new Response(await zip.generateAsync({type:'uint8array'})))));
    zip.file('cue.png',Buffer.from([137,80,78,71]));
    await sub._extract(Promise.resolve(new Response(await zip.generateAsync({type:'uint8array'}))));
    assert.equal(sub.lines[0].begin,1); assert.equal(sub.extentWidth,1920);
  } finally {h.close();}
});
test('Safari content relay uses isolated runtime, filters origins, queues until settings arrive', () => {
  const dom=new JSDOM('',{url:'https://www.netflix.com/watch/1',runScripts:'outside-only'});
  const ctx=dom.getInternalVMContext(); let onMessage; const sent=[];
  const port={onMessage:{addListener:f=>onMessage=f},onDisconnect:{addListener(){}},postMessage:m=>sent.push(m)};
  Object.assign(ctx,{BROWSER:'safari',browser:{runtime:{connect:()=>port}},require:()=>({log(){},warn(){},error(){}})});
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../src/content.js'),'utf8'),ctx);
  const send=(origin,source=dom.window)=>dom.window.dispatchEvent(new dom.window.MessageEvent('message',{source,origin,data:{namespace:'nflxmultisubs',action:'startPlayback'}}));
  send('https://evil.test'); assert.equal(sent.length,0);
  send('https://www.netflix.com'); assert.equal(sent.length,0);
  onMessage({settings:defaults}); assert.equal(sent[0].startPlayback,1);
  dom.window.close();
});
test('Safari background accepts content connections without onConnectExternal; settings persist', async () => {
  let connect; let stored;
  const chrome={runtime:{onConnect:{addListener:f=>connect=f}},storage:{local:{get:(_,cb)=>cb({settings:defaults}),set:(value,cb)=>{stored=value.settings;cb();}}},browserAction:{setIcon(){}}};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../src/service_worker.js'),'utf8'),{chrome,BROWSER:'safari',require:()=>defaults,console:{log(){},error(){}}});
  let receive;const replies=[];
  const port={sender:{tab:{id:3}},onMessage:{addListener:f=>receive=f},onDisconnect:{addListener(){}},postMessage:m=>replies.push(m)};
  connect(port); await new Promise(r=>setTimeout(r,0));
  receive({settings:{secondaryLanguageMode:'last',secondaryLanguageLastUsed:'zh'}});
  assert.equal(stored.secondaryLanguageLastUsed,'zh'); assert.equal(replies.at(-1).settings.secondaryLanguageMode,'last');
});
test('subtitle spacing uses actual bounds and keeps multiline secondary inside the viewport', () => {
  assert.deepEqual(utils.subtitleOffsets(650,648,678,768,18),{primary:0,secondary:20});
  assert.deepEqual(utils.subtitleOffsets(690,680,742,768,18),{primary:-18,secondary:10});
  assert.deepEqual(utils.subtitleOffsets(600,650,680,768,18),{primary:0,secondary:-32});
});
test('renderer separates measured primary and secondary rows without accumulating offsets', () => {
  const h=harness();
  try {
    const doc=h.dom.window.document;
    const video=doc.querySelector('video'); video.getBoundingClientRect=()=>({top:0,bottom:768,height:768});
    const primary=doc.createElement('div'); primary.className='nflxmultisubs-primary-wrapper';
    primary.innerHTML='<div class="player-timedtext-text-container"><span>中文</span></div>';doc.body.append(primary);
    primary.querySelector('span').getBoundingClientRect=()=>({width:200,height:40,top:620,bottom:660});
    const loop=new h.api.RendererLoop(video);loop._appendSubtitleWrapper();loop.subSvg=loop.subtitleWrapperElem.querySelector('svg');
    const text=doc.createElementNS('http://www.w3.org/2000/svg','text');loop.subSvg.append(text);
    text.getBoundingClientRect=()=>({width:200,height:30,top:648,bottom:678});
    loop.setRenderDirty();loop._separateSubtitleRows();assert.equal(loop.subSvg.style.translate,'0 16px');
    loop._separateSubtitleRows();assert.equal(loop.subSvg.style.translate,'0 16px');
    loop.subSvg.replaceChildren();loop._separateSubtitleRows();assert.equal(primary.style.translate,'');
  } finally {h.close();}
});
test('replaced player container rebuilds overlay and invalidates cached cue rendering', () => {
  const h=harness();
  try {
    const doc=h.dom.window.document;const video=doc.querySelector('video');
    const loop=new h.api.RendererLoop(video);loop._appendSubtitleWrapper();
    const previous=loop.subtitleWrapperElem;
    previous.parentNode.remove();
    const replacement=doc.createElement('div');replacement.dataset.uia='video-canvas';replacement.append(video);doc.querySelector('#appMountPoint').append(replacement);
    loop.isRenderDirty=false;loop._appendSubtitleWrapper();
    assert.notEqual(loop.subtitleWrapperElem,previous);assert.ok(loop.subtitleWrapperElem.isConnected);assert.equal(loop.isRenderDirty,true);
  } finally {h.close();}
});

test('compact gap pulls rows together and stays four CSS pixels on large screens', () => {
  for (const top of [620, 650, 720, 850]) {
    const offsets = utils.subtitleOffsets(640, top, top + 30, 1080, 4);
    assert.equal(top + offsets.secondary - (640 + offsets.primary), 4);
  }
  const offsets = utils.subtitleOffsets(700, 745, 790, 768, 4);
  assert.equal(745 + offsets.secondary - (700 + offsets.primary), 4);
  assert.ok(790 + offsets.secondary <= 752);
});
