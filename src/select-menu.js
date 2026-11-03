'use strict';
// Keep native select values/events, but render menus inside the popover's web view.
(() => {
  let active = null;
  function close(restore = false) {
    if (!active) return;
    const {menu, button} = active;
    menu.remove(); button.setAttribute('aria-expanded', 'false'); active = null;
    if (restore && button.isConnected) button.focus();
  }
  function enhance(select) {
    if (select.dataset.inlineSelect) return;
    select.dataset.inlineSelect = 'true';
    const button = document.createElement('button');
    button.type = 'button'; button.className = `select-trigger ${select.className}`;
    button.id = `${select.id}-trigger`;
    button.setAttribute('aria-haspopup', 'listbox'); button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', select.getAttribute('aria-label') || (select.id === 'speechAccent' ? '英语口音' : '选择选项'));
    select.tabIndex = -1; select.setAttribute('aria-hidden', 'true'); select.classList.add('select-source');
    select.after(button);
    const sync = () => { button.textContent = select.selectedOptions[0]?.textContent || '没有匹配选项'; button.disabled = select.disabled || !select.options.length; };
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(select, 'value', {get(){return descriptor.get.call(this)},set(value){descriptor.set.call(this,value);sync()}});
    select.addEventListener('change', sync); sync();
    function open() {
      if (active?.button === button) return close();
      close();
      const menu = document.createElement('div'); menu.className = 'select-menu'; menu.role = 'listbox';
      menu.id = `${select.id}-options`; menu.setAttribute('aria-label', button.getAttribute('aria-label'));
      button.setAttribute('aria-controls', menu.id); button.setAttribute('aria-expanded', 'true');
      const options = Array.from(select.options).map((option, index) => {
        const item = document.createElement('button'); item.type = 'button'; item.role = 'option';
        item.textContent = option.textContent; item.disabled = option.disabled;
        item.setAttribute('aria-selected', String(index === select.selectedIndex));
        item.onclick = () => { select.value = option.value; close(true); select.dispatchEvent(new Event('change', {bubbles:true})); };
        menu.append(item); return item;
      });
      document.body.append(menu); active = {menu, button};
      const rect = button.getBoundingClientRect();
      const below = innerHeight - rect.bottom - 8, above = rect.top - 8;
      const down = below >= Math.min(240, menu.scrollHeight) || below >= above;
      menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - rect.width - 8))}px`;
      menu.style.width = `${Math.min(rect.width, innerWidth - 16)}px`;
      menu.style.maxHeight = `${Math.min(300, down ? below : above)}px`;
      if (down) menu.style.top = `${rect.bottom + 4}px`; else menu.style.bottom = `${innerHeight - rect.top + 4}px`;
      const enabled = options.filter(item => !item.disabled);
      const focus = item => {item?.focus({preventScroll:true});if(item){const y=item.offsetTop;if(y<menu.scrollTop)menu.scrollTop=y;else if(y+item.offsetHeight>menu.scrollTop+menu.clientHeight)menu.scrollTop=y+item.offsetHeight-menu.clientHeight}};
      focus(options[select.selectedIndex] || enabled[0]);
      menu.onkeydown = event => {
        const index = enabled.indexOf(document.activeElement);
        if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length-1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
          focus(enabled[next]);
        } else if(event.key === 'Escape'){event.preventDefault();close(true)}
        else if(event.key === 'Tab') close();
      };
    }
    button.onclick = open;
    button.onkeydown = event => {if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open()}};
  }
  document.addEventListener('pointerdown', event => {if(active && !active.menu.contains(event.target) && !active.button.contains(event.target))close()});
  window.addEventListener('resize', () => close());

  const refresh = () => {
    if(active && !active.button.isConnected)close();
    document.querySelectorAll('select:not([data-inline-select])').forEach(enhance);
  };
  new MutationObserver(refresh).observe(document.querySelector('#workspace'), {childList:true, subtree:true});
  refresh();
})();
