(() => {
  'use strict';
  const data = window.MERCHANT_DEMO;
  const $ = id => document.getElementById(id);
  const selected = new Set();
  let batch = [], groups = new Map(), winners = [], currentId = null, filter = 'all';
  const fields = [
    ['merchant_name', 'Merchant name', 'Whitespace collapsed and title case applied'],
    ['business_category_freetext', 'Business category', 'Mapped by deterministic keyword rules'],
    ['region', 'Region', 'Checked against the reference regions'],
    ['contact_phone', 'Phone', 'Formatting removed; country prefix normalised'],
    ['contact_email', 'Email', 'Trimmed and lowercased'],
    ['registration_date', 'Registration date', 'Converted to ISO date format']
  ];
  const ruleMatches = [
    reason => reason.startsWith('Missing required'),
    reason => reason.startsWith('Invalid region'),
    reason => reason.startsWith('Invalid email'),
    reason => reason.startsWith('Invalid phone'),
    reason => reason.startsWith('Unmappable business'),
    reason => reason.startsWith('Registration date') || reason.startsWith('Unparseable registration'),
    reason => reason.startsWith('Merchant is already')
  ];
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function updateTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    $('wb-theme').textContent = light ? 'Dark mode' : 'Light mode';
    $('wb-theme').setAttribute('aria-label', 'Switch to ' + (light ? 'dark' : 'light') + ' mode');
  }
  $('wb-theme').addEventListener('click', () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', document.documentElement.dataset.theme); } catch (_) {}
    updateTheme();
  });
  updateTheme();

  function updateTray() {
    document.querySelectorAll('.wb-file').forEach(button => {
      const active = selected.has(button.dataset.partner);
      button.setAttribute('aria-pressed', String(active));
      button.querySelector('.wb-file-state').textContent = active ? 'Added / remove' : '+ Add';
    });
    const count = data.records.filter(row => selected.has(row.partner)).length;
    $('tray-label').textContent = selected.size ? selected.size + ' sample file' + (selected.size > 1 ? 's' : '') + ' ready' : 'Your batch starts here';
    $('tray-summary').textContent = selected.size ? count + ' submissions from Partner ' + [...selected].sort().join(' + ') : 'Drop sample cards here or use the Add buttons.';
    $('run-batch').disabled = !selected.size;
    $('reset-batch').disabled = !selected.size;
    $('wb-results').hidden = true;
    $('batch-status').textContent = selected.size ? 'Batch updated. Select Explore processing to see its results.' : 'Choose a sample to begin.';
  }
  document.querySelectorAll('.wb-file').forEach(button => {
    button.addEventListener('click', () => {
      selected.has(button.dataset.partner) ? selected.delete(button.dataset.partner) : selected.add(button.dataset.partner);
      updateTray();
    });
    button.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', 'merchant-demo:' + button.dataset.partner);
      event.dataTransfer.effectAllowed = 'copy';
    });
    button.addEventListener('dragend', () => $('drop-tray').classList.remove('drag-over'));
  });
  const tray = $('drop-tray');
  tray.addEventListener('dragover', event => { event.preventDefault(); tray.classList.add('drag-over'); });
  tray.addEventListener('dragleave', event => { if (!tray.contains(event.relatedTarget)) tray.classList.remove('drag-over'); });
  tray.addEventListener('drop', event => {
    event.preventDefault(); tray.classList.remove('drag-over');
    const match = /^merchant-demo:([ABC])$/.exec(event.dataTransfer.getData('text/plain'));
    if (!match || event.dataTransfer.files.length) {
      $('batch-status').textContent = 'Use the three sample cards above. Personal file uploads are not part of this replay.';
      return;
    }
    selected.add(match[1]); updateTray();
  });
  // Prevent a file dropped outside the tray from replacing the page.
  window.addEventListener('dragover', event => event.preventDefault());
  window.addEventListener('drop', event => event.preventDefault());
  $('load-all').addEventListener('click', () => { ['A', 'B', 'C'].forEach(p => selected.add(p)); updateTray(); });
  $('reset-batch').addEventListener('click', () => {
    selected.clear(); batch = []; groups.clear(); winners = []; currentId = null;
    $('record-search').value = ''; $('error-rule').value = 'all'; updateTray();
  });

  const groupFor = row => row.clean ? groups.get(row.clean._dedup_key) : [];
  const removed = row => row.clean && groupFor(row)[0].id !== row.id;
  const status = row => !row.clean ? 'Rejected' : removed(row) ? 'Duplicate removed' : 'Clean';
  $('run-batch').addEventListener('click', () => {
    batch = data.records.filter(row => selected.has(row.partner));
    groups = new Map();
    batch.filter(row => row.clean).forEach(row => {
      const key = row.clean._dedup_key;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    groups.forEach(group => group.sort((a, b) => b.clean.registration_date.localeCompare(a.clean.registration_date) || a.id.localeCompare(b.id)));
    winners = [...groups.values()].map(group => group[0]).sort((a, b) => a.id.localeCompare(b.id));
    const rejected = batch.filter(row => !row.clean).length;
    const duplicates = batch.length - rejected - winners.length;
    $('metric-in').textContent = batch.length;
    $('metric-clean').textContent = winners.length;
    $('metric-errors').textContent = rejected;
    $('metric-dupes').textContent = duplicates;
    $('batch-name').textContent = 'Partner ' + [...selected].sort().join(' + ');
    $('reconcile').textContent = batch.length + ' submissions = ' + winners.length + ' clean merchants + ' + rejected + ' rejected submissions + ' + duplicates + ' duplicate submissions removed.';
    [['clean', winners.length], ['errors', rejected], ['dupes', duplicates]].forEach(([key, count]) => $('bar-' + key).style.width = count / batch.length * 100 + '%');
    filter = 'all'; currentId = null; $('record-search').value = ''; $('error-rule').value = 'all';
    $('wb-results').hidden = false; renderFilters(); renderList();
    $('batch-status').textContent = 'Results ready. Explore a record below to see what changed and why.';
    $('wb-results').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'});
  });
  data.rules.forEach((rule, index) => {
    const option = el('option', '', rule); option.value = String(index); $('error-rule').append(option);
  });
  function renderFilters() {
    document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    document.querySelector('.wb-error-filter').hidden = filter !== 'rejected';
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter; currentId = null; renderFilters(); renderList();
  }));
  $('record-search').addEventListener('input', renderList);
  $('error-rule').addEventListener('change', renderList);
  function renderList() {
    const query = $('record-search').value.toLowerCase().trim();
    const rule = $('error-rule').value;
    const rows = batch.filter(row => {
      const matchesStatus = filter === 'all' || (filter === 'clean' && row.clean && !removed(row)) || (filter === 'rejected' && !row.clean) || (filter === 'duplicate' && row.clean && groupFor(row).length > 1);
      const matchesRule = filter !== 'rejected' || rule === 'all' || row.reasons.some(ruleMatches[Number(rule)]);
      return matchesStatus && matchesRule && (row.id + ' ' + row.raw.merchant_name).toLowerCase().includes(query);
    });
    if (!rows.some(row => row.id === currentId)) currentId = rows[0]?.id || null;
    $('record-count').textContent = rows.length + ' matching record' + (rows.length !== 1 ? 's' : '') + (filter === 'duplicate' ? ' (includes retained records in duplicate groups)' : '');
    $('record-list').replaceChildren(...rows.map(row => {
      const button = el('button', 'wb-record', row.raw.merchant_name.trim() || '(Missing merchant name)');
      button.type = 'button'; button.dataset.record = row.id;
      button.setAttribute('aria-pressed', String(row.id === currentId));
      button.append(el('small', '', row.id + ' / Partner ' + row.partner + ' / ' + status(row)));
      button.addEventListener('click', () => {
        currentId = row.id;
        document.querySelectorAll('.wb-record').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.record === currentId)));
        inspect(row);
      });
      return button;
    }));
    document.querySelector('.wb-inspector').hidden = !currentId;
    if (currentId) inspect(rows.find(row => row.id === currentId));
    else $('record-list').append(el('p', 'wb-muted', 'No matches. Try another search or filter.'));
  }
  function inspect(row) {
    $('inspect-id').textContent = row.id + ' / Partner ' + row.partner;
    $('inspect-title').textContent = row.raw.merchant_name.trim() || 'Missing merchant name';
    $('inspect-status').textContent = status(row);
    $('inspect-summary').textContent = !row.clean ? 'This submission is held out of the clean output. All reported issues are shown together.' : removed(row) ? 'Validation succeeded, but another record represents this merchant in the final output.' : 'This record passed validation and is retained in the clean output. Highlighted fields show transformations.';
    const original = el('div', 'wb-version'); original.append(el('h4', '', 'Original submission'));
    const output = el('div', 'wb-version'); output.append(el('h4', '', row.clean ? 'Normalised record' : 'Rejected / needs correction'));
    fields.forEach(([key, label, explanation]) => {
      const raw = row.raw[key];
      const value = row.clean?.[key === 'business_category_freetext' ? 'canonical_category' : key];
      const changed = row.clean && raw !== value;
      const addField = (target, content, highlight, note) => {
        const wrapper = el('dl', 'wb-field' + (highlight ? ' changed' : ''));
        wrapper.append(el('dt', '', label), el('dd', '', content || '(blank)'));
        if (note) wrapper.append(el('small', '', note));
        target.append(wrapper);
      };
      addField(original, raw, changed);
      if (row.clean) addField(output, value, changed, changed ? explanation : null);
    });
    if (!row.clean) {
      const rejection = el('div', 'wb-rejection', 'No clean record is produced for this submission.');
      const reasons = el('ul'); row.reasons.forEach(reason => reasons.append(el('li', '', reason)));
      rejection.append(reasons, el('p', '', 'Routing: ' + routeFor(row)));
      output.append(rejection);
    }
    $('record-compare').replaceChildren(original, output);
    $('record-rules').replaceChildren(...data.rules.map((rule, index) => {
      const failed = row.reasons.some(ruleMatches[index]);
      const node = el('div', 'wb-rule' + (failed ? ' failed' : ''));
      node.append(el('b', '', failed ? 'Issue' : 'No issue'), document.createTextNode(rule));
      return node;
    }));
    const group = groupFor(row);
    $('duplicate-detail').hidden = group.length < 2;
    if (group.length > 1) {
      const winner = group[0];
      const list = el('ul');
      group.forEach(r => {
        const item = el('li', '', r.id + ' / Partner ' + r.partner + ' / ' + r.clean.registration_date + ' / ');
        item.append(el('strong', '', r.id === winner.id ? 'Retained' : 'Removed as duplicate')); list.append(item);
      });
      $('duplicate-detail').replaceChildren(el('h4', '', 'Why this record wins'), el('p', '', 'Grouped by normalised merchant name. Latest registration date wins; the lexicographically smallest submission ID breaks a date tie. ' + winner.id + ' is retained.'), list);
    }
  }
  function routeFor(row) {
    if (!row.raw.region.trim() || row.reasons.some(ruleMatches[1])) return 'UNKNOWN - invalid region';
    return row.raw.region.trim().toLowerCase() + '@example.test';
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    $('record-compare').dataset.view = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }));
  $('record-compare').dataset.view = 'original';
  function downloadCsv(filename, columns, rows) {
    const quote = value => {
      let text = String(value ?? '');
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const csv = [columns, ...rows.map(row => columns.map(key => row[key]))].map(row => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    const a = el('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('export-clean').addEventListener('click', () => {
    downloadCsv('demo-clean.csv', ['merchant_name','canonical_category','region','contact_phone','contact_email','registration_date','region_pic_email','source_submission_id','duplicates_collapsed'], winners.map(row => ({...row.clean, duplicates_collapsed:groupFor(row).length})));
  });
  $('export-errors').addEventListener('click', () => {
    downloadCsv('demo-errors.csv', ['submission_id','source_file','merchant_name','region','region_pic_email','rejection_reasons'], batch.filter(row => !row.clean).map(row => ({submission_id:row.id,source_file:'demo_partner'+row.partner+'.csv',merchant_name:row.raw.merchant_name.trim(),region:row.raw.region.trim(),region_pic_email:routeFor(row),rejection_reasons:row.reasons.join('; ')})));
  });
})();
