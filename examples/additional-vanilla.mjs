// Minimal native counterparts to the React demos. No external dependencies.
export const vanilla = {
  "date-range-picker": {
    html: `<section class="modern-demo"><label>开始日期<input id="start" type="date" value="2026-09-05"></label><label>结束日期<input id="end" type="date" value="2026-09-12" min="2026-09-05" aria-describedby="status"></label><div class="modern-actions"><button data-days="7">7 天</button><button data-days="30">30 天</button></div><p id="status" role="status"></p></section>`,
    js: `const start = document.querySelector('#start');
const end = document.querySelector('#end');
const status = document.querySelector('#status');
function update() {
  end.min = start.value;
  const invalid = Boolean(start.value && end.value && end.value < start.value);
  end.setAttribute('aria-invalid', String(invalid));
  status.textContent = invalid ? '结束日期不能早于开始日期' : start.value && end.value ? start.value + ' — ' + end.value : '请选择完整日期范围';
}
start.addEventListener('input', update);
end.addEventListener('input', update);
document.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', () => {
  if (!start.value) return;
  const date = new Date(start.value + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + Number(button.dataset.days) - 1);
  end.value = date.toISOString().slice(0, 10);
  update();
}));
update();`,
  },
  "time-field": {
    html: `<section class="modern-demo"><label>预约时间<input id="time" type="time" min="09:00" max="18:00" step="900" value="09:30" aria-describedby="status"></label><div class="modern-actions"><button data-time="09:00">09:00</button><button data-time="09:15">09:15</button><button data-time="09:30">09:30</button></div><p id="status" role="status"></p></section>`,
    js: `const input = document.querySelector('#time');
function update() {
  const valid = Boolean(input.value) && input.checkValidity();
  input.setAttribute('aria-invalid', String(!valid));
  document.querySelector('#status').textContent = valid ? input.value + ' · 上海时间 / UTC+8' : '请选择 09:00 至 18:00，每 15 分钟一个时段';
}
input.addEventListener('input', update);
document.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.time; update(); }));
update();`,
  },
  "multi-select": {
    html: `<section class="modern-demo"><input id="search" type="search" aria-label="搜索团队" placeholder="搜索团队"><fieldset class="modern-options"><legend>参与团队</legend><label><input type="checkbox" value="设计" checked>设计</label><label><input type="checkbox" value="研发">研发</label><label><input type="checkbox" value="产品">产品</label><label><input type="checkbox" value="研究">研究</label></fieldset><div id="selected" class="modern-actions" aria-label="已选团队"></div><p id="status" role="status"></p></section>`,
    js: `const inputs = [...document.querySelectorAll('input[type=checkbox]')];
function update() {
  const selected = inputs.filter(input => input.checked);
  const buttons = selected.map(input => {
    const button = document.createElement('button');
    button.textContent = input.value + ' ×';
    button.setAttribute('aria-label', '移除' + input.value);
    button.onclick = () => { input.checked = false; update(); document.querySelector('#search').focus(); };
    return button;
  });
  document.querySelector('#selected').replaceChildren(...buttons);
  document.querySelector('#status').textContent = '已选 ' + selected.length + ' 个团队';
}
inputs.forEach(input => input.addEventListener('change', update));
document.querySelector('#search').addEventListener('input', event => {
  inputs.forEach(input => { input.parentElement.style.display = input.value.includes(event.target.value) ? '' : 'none'; });
});
update();`,
  },
  rating: {
    html: `<section class="modern-demo"><fieldset class="modern-rating"><legend>这次体验怎么样？</legend><div>${[1,2,3,4,5].map(value => `<label><input type="radio" name="rating" value="${value}" aria-label="${value} 星"><span aria-hidden="true">★</span></label>`).join('')}</div></fieldset><p id="status" role="status">选择 1 至 5 星评分</p><button id="reset">清除评分</button></section>`,
    js: `const inputs = [...document.querySelectorAll('input[name=rating]')];
let value = 0;
function paint(preview = value) { inputs.forEach(input => { input.parentElement.dataset.filled = String(Number(input.value) <= preview); }); }
inputs.forEach(input => {
  input.addEventListener('change', () => { value = Number(input.value); paint(); document.querySelector('#status').textContent = value + ' / 5'; });
  input.parentElement.addEventListener('mouseenter', () => paint(Number(input.value)));
});
document.querySelector('fieldset').addEventListener('mouseleave', () => paint());
document.querySelector('#reset').addEventListener('click', () => { value = 0; inputs.forEach(input => input.checked = false); paint(); document.querySelector('#status').textContent = '评分已清除'; });`,
  },
  menubar: {
    html: `<section class="modern-demo"><div role="menubar" aria-label="编辑器菜单" class="modern-menubar">${[{name:'文件',items:['新建画板','保存副本']},{name:'编辑',items:['撤销操作','复制图层']},{name:'视图',items:['显示网格','适合窗口']}].map((menu,index) => `<div role="none"><button id="trigger-${index}" data-menu-trigger role="menuitem" aria-haspopup="menu" aria-expanded="false" aria-controls="popup-${index}" tabindex="${index ? -1 : 0}">${menu.name}</button><div id="popup-${index}" data-menu-popup role="menu" aria-labelledby="trigger-${index}" hidden>${menu.items.map(item => `<button role="menuitem" tabindex="-1">${item}</button>`).join('')}</div></div>`).join('')}</div><p id="status" role="status">选择一个编辑命令</p></section>`,
    js: `const bar = document.querySelector('[role=menubar]');
const triggers = [...bar.querySelectorAll('[data-menu-trigger]')];
let active = 0;
function close() { bar.querySelectorAll('[data-menu-popup]').forEach(menu => menu.hidden = true); triggers.forEach(button => button.setAttribute('aria-expanded', 'false')); }
function top(index) { active = (index + triggers.length) % triggers.length; triggers.forEach((button, i) => button.tabIndex = i === active ? 0 : -1); triggers[active].focus(); }
function open(index, last = false) { close(); top(index); const menu = triggers[active].nextElementSibling; menu.hidden = false; triggers[active].setAttribute('aria-expanded', 'true'); const items = [...menu.querySelectorAll('[role=menuitem]')]; items[last ? items.length - 1 : 0].focus(); }
triggers.forEach((button, index) => {
  button.onclick = () => button.getAttribute('aria-expanded') === 'true' ? close() : open(index);
  button.onkeydown = event => {
    if (['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) { event.preventDefault(); top(event.key === 'Home' ? 0 : event.key === 'End' ? triggers.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1)); }
    if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); open(index, event.key === 'ArrowUp'); }
  };
  const menu = button.nextElementSibling;
  const items = [...menu.querySelectorAll('[role=menuitem]')];
  items.forEach(item => item.onclick = () => { document.querySelector('#status').textContent = '已执行：' + item.textContent; close(); top(index); });
  menu.onkeydown = event => {
    const current = items.indexOf(document.activeElement);
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length; items[next].focus(); }
    else if (['ArrowRight','ArrowLeft'].includes(event.key)) { event.preventDefault(); open(index + (event.key === 'ArrowRight' ? 1 : -1)); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); top(index); }
    else if (event.key === 'Tab') { close(); top(index); }
  };
});
bar.addEventListener('focusout', event => { if (!bar.contains(event.relatedTarget)) close(); });`,
  },
  questionnaire: {
    html: `<section class="modern-demo"><p id="step"></p><fieldset class="modern-options"><legend tabindex="-1" id="question"></legend><div id="answers"></div></fieldset><div class="modern-actions"><button id="back">上一步</button><button id="next">下一步</button></div><p id="summary" role="status"></p></section>`,
    js: `const questions = [{title:'你在设计什么？', options:['网站','移动应用','桌面工具']}, {title:'更关注哪一方面？', options:['视觉设计','交互行为','代码实现']}];
const answers = ['', ''];
let step = 0;
function render(focus = false) {
  const done = step === questions.length;
  document.querySelector('#step').textContent = done ? '问卷完成' : '问题 ' + (step + 1) + ' / 2';
  document.querySelector('#question').textContent = done ? '完成' : questions[step].title;
  document.querySelector('#answers').replaceChildren(...(done ? [] : questions[step].options.map(option => {
    const label = document.createElement('label'); const input = document.createElement('input');
    input.type = 'radio'; input.name = 'answer'; input.checked = answers[step] === option;
    input.onchange = () => { answers[step] = option; document.querySelector('#next').disabled = false; };
    label.append(input, option); return label;
  })));
  document.querySelector('#back').disabled = step === 0;
  document.querySelector('#next').disabled = !done && !answers[step];
  document.querySelector('#next').textContent = done ? '重新填写' : step === 1 ? '完成问卷' : '下一步';
  document.querySelector('#summary').textContent = done ? answers.join(' · ') : '';
  if (focus) document.querySelector('#question').focus();
}
document.querySelector('#back').onclick = () => { step -= 1; render(true); };
document.querySelector('#next').onclick = () => { if (step === 2) { step = 0; answers.fill(''); } else step += 1; render(true); };
render();`,
  },
  "chat-message": {
    html: `<section class="modern-demo"><div class="modern-kicker">本地消息演示</div><div class="modern-message"><small>你</small><p id="message">侧边滑出的面板叫什么？</p></div><form class="modern-message-form"><input aria-label="输入消息" maxlength="160" required><button type="submit">发送</button></form><button id="copy">复制消息</button><p id="status" role="status">消息仅在当前演示中展示</p></section>`,
    js: `const input = document.querySelector('input');
const message = document.querySelector('#message');
const status = document.querySelector('#status');
document.querySelector('form').onsubmit = event => { event.preventDefault(); if (!input.value.trim()) return; message.textContent = input.value.trim(); input.value = ''; status.textContent = '消息已发送到本地演示'; };
document.querySelector('#copy').onclick = async () => { try { await navigator.clipboard.writeText(message.textContent); status.textContent = '已复制消息'; } catch { status.textContent = '无法复制，请手动选择消息文字'; } };`,
  },
  "message-scroller": {
    html: `<section class="modern-demo"><div class="modern-transcript" role="log" aria-label="示例消息记录" aria-relevant="additions" tabindex="0">${['开始整理组件目录','确认输入与选择的区别','补充键盘操作说明','检查可复制代码','欢迎继续讨论'].map(text => `<p>${text}</p>`).join('')}</div><div class="modern-actions"><button id="add">添加消息</button><button id="latest" hidden>查看新消息 ↓</button></div><p id="status" role="status">正在跟随最新消息</p></section>`,
    js: `const log = document.querySelector('[role=log]');
const latest = document.querySelector('#latest');
const status = document.querySelector('#status');
let follow = true;
log.scrollTop = log.scrollHeight;
log.onscroll = () => { follow = log.scrollHeight - log.scrollTop - log.clientHeight < 24; if (follow) { latest.hidden = true; status.textContent = '正在跟随最新消息'; } };
document.querySelector('#add').onclick = () => {
  const message = document.createElement('p'); message.textContent = '新的组件笔记 ' + (log.children.length + 1); log.append(message);
  if (follow) log.scrollTop = log.scrollHeight;
  else { latest.hidden = false; status.textContent = '已保留你正在阅读的位置'; }
  if (log.children.length >= 50) document.querySelector('#add').disabled = true;
};
latest.onclick = () => { follow = true; log.scrollTop = log.scrollHeight; latest.hidden = true; status.textContent = '正在跟随最新消息'; };`,
  },
  attachment: {
    html: `<section class="modern-demo"><article class="modern-attachment"><span class="modern-filetype" aria-hidden="true">TXT</span><div><strong>组件笔记.txt</strong><small>纯文本 · 本地示例</small></div><button id="remove" aria-label="移除组件笔记.txt">×</button></article><button id="toggle" aria-expanded="false" aria-controls="preview">预览组件笔记</button><div id="preview" hidden>附件展示文件名称与状态；文件上传负责选择和提交文件。</div><button id="restore" hidden>恢复附件</button><p id="status" role="status"></p></section>`,
    js: `const toggle = document.querySelector('#toggle');
const preview = document.querySelector('#preview');
const restore = document.querySelector('#restore');
toggle.onclick = () => { preview.hidden = !preview.hidden; toggle.setAttribute('aria-expanded', String(!preview.hidden)); };
document.querySelector('#remove').onclick = () => { document.querySelector('article').hidden = true; toggle.hidden = true; preview.hidden = true; toggle.setAttribute('aria-expanded', 'false'); restore.hidden = false; document.querySelector('#status').textContent = '已移除组件笔记'; restore.focus(); };
restore.onclick = () => { document.querySelector('article').hidden = false; toggle.hidden = false; restore.hidden = true; document.querySelector('#status').textContent = '已恢复附件'; toggle.focus(); };`,
  },
};
