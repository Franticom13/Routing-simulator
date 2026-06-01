// TabBar — horizontalni lista tabu nad canvas oblasti
// kazdy tab = nezavisly workspace s vlastnim grafem a simulaci
// pravy klik = context menu (prejmenovat / zavrit)
// drag & drop pro zmenu poradi tabu
// aktivni tab ma plynule posuvny indikator

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { PlusIcon, CloseIcon } from './Icons';

export interface TabInfo {
  id: string;
  name: string;
}

interface TabBarProps {
  tabs: TabInfo[];
  activeTabId: string;
  onSwitchTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, newName: string) => void;
  onReorderTabs: (fromIndex: number, toIndex: number) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSwitchTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
  onReorderTabs,
}: TabBarProps) {
  // stav pro inline prejmenovani (spousteno z context menu)
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(0);

  // context menu stav
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    tabId: string;
  }>({ isOpen: false, x: 0, y: 0, tabId: '' });

  // ref na context menu element pro click-outside detekci
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // drag & drop stav
  const [dragTabId, setDragTabId] = useState<string | null>(null);

  // refy pro mereni pozic tabu — sliding indicator
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    initialized: boolean;
  }>({ left: 0, width: 0, initialized: false });

  // aktualizovat pozici indikatoru
  function updateIndicator() {
    const activeEl = tabRefs.current[activeTabId];
    const container = tabsContainerRef.current;
    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      setIndicatorStyle({
        left: activeRect.left - containerRect.left,
        width: activeRect.width,
        initialized: true,
      });
    }
  }

  // merit pri zmene aktivniho tabu nebo seznamu tabu
  useLayoutEffect(function () {
    updateIndicator();
  }, [activeTabId, tabs.length, tabs.map(function (t) { return t.id; }).join(',')]);

  // re-merit po renderovani
  useEffect(function () {
    var timer = setTimeout(updateIndicator, 50);
    return function () { clearTimeout(timer); };
  }, [activeTabId, tabs.length]);

  // ResizeObserver — sledovat zmenu velikosti aktivniho tabu (napr. pri editaci)
  useEffect(function () {
    var activeEl = tabRefs.current[activeTabId];
    if (!activeEl) { return; }
    var observer = new ResizeObserver(function () {
      updateIndicator();
    });
    observer.observe(activeEl);
    return function () { observer.disconnect(); };
  }, [activeTabId]);

  // focus na input pri zahajeni editace
  useEffect(function () {
    if (editingTabId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  // merit sirku inputu podle obsahu
  useEffect(function () {
    if (measureRef.current) {
      // +2px pro kurzor
      setInputWidth(measureRef.current.offsetWidth + 2);
    }
  }, [editValue, editingTabId]);

  // zavrit context menu pri kliknuti mimo nej
  useEffect(function () {
    if (!contextMenu.isOpen) { return; }
    function handleClickOutside(e: PointerEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(function (prev) { return { ...prev, isOpen: false }; });
      }
    }
    // pouzit setTimeout aby se listener pridal az po aktualnim event cyklu
    // pouzit pointerdown + capture:true protoze canvas zachytava mousedown
    var timer = setTimeout(function () {
      document.addEventListener('pointerdown', handleClickOutside as EventListener, true);
    }, 0);
    return function () {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleClickOutside as EventListener, true);
    };
  }, [contextMenu.isOpen]);

  // potvrdit editaci
  function handleEditConfirm() {
    if (editingTabId !== null && editValue.trim() !== '') {
      onRenameTab(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
    setEditValue('');
  }

  // zrusit editaci
  function handleEditCancel() {
    setEditingTabId(null);
    setEditValue('');
  }

  // klavesove zkratky v inputu
  function handleEditKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') {
      handleEditConfirm();
    } else if (event.key === 'Escape') {
      handleEditCancel();
    }
  }

  // context menu akce
  function handleContextMenuRename() {
    var tabId = contextMenu.tabId;
    var tab = tabs.find(function (t) { return t.id === tabId; });
    setContextMenu(function (prev) { return { ...prev, isOpen: false }; });
    if (tab) {
      var foundTab = tab;
      // maly delay aby se context menu stihl zavrit pred otevrenim inputu
      setTimeout(function () {
        setEditingTabId(foundTab.id);
        setEditValue(foundTab.name);
      }, 10);
    }
  }

  function handleContextMenuClose() {
    var tabId = contextMenu.tabId;
    setContextMenu(function (prev) { return { ...prev, isOpen: false }; });
    onCloseTab(tabId);
  }

  // custom drag — pointer-based, tab follows mouse horizontally
  const dragStateRef = useRef<{
    tabId: string;
    startX: number;
    originalIndex: number;
    pointerId: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [dragTargetIndex, setDragTargetIndex] = useState<number>(-1);
  const [dragOriginalIndex, setDragOriginalIndex] = useState<number>(-1);

  const DRAG_THRESHOLD = 5; // px pred aktivaci vizualniho tazeni

  function handlePointerDown(e: React.PointerEvent, tabId: string) {
    // jen levy klik
    if (e.button !== 0) { return; }
    var tabEl = tabRefs.current[tabId];
    if (!tabEl || editingTabId === tabId) { return; }

    var origIndex = tabs.findIndex(function (t) { return t.id === tabId; });
    if (origIndex === -1) { return; }

    // zabranit vyberu textu pri tazeni
    e.preventDefault();
    tabEl.setPointerCapture(e.pointerId);

    dragStateRef.current = {
      tabId: tabId,
      startX: e.clientX,
      originalIndex: origIndex,
      pointerId: e.pointerId,
    };
    // NESTAVIME dragTabId hned — cekame na prah pohybu
  }

  function handlePointerMove(e: React.PointerEvent) {
    var state = dragStateRef.current;
    if (!state) { return; }

    var dx = e.clientX - state.startX;

    // aktivovat drag az po prahu
    if (dragTabId === null) {
      if (Math.abs(dx) < DRAG_THRESHOLD) { return; }
      // prah prekrocen — aktivovat drag
      setDragTabId(state.tabId);
      setDragOriginalIndex(state.originalIndex);
      setDragTargetIndex(state.originalIndex);
    }

    setDragOffset(dx);

    // vypocitat nad kterym slotem je tazeny tab
    var container = tabsContainerRef.current;
    if (!container) { return; }

    // zjistit aktualni pozici stredu tazeneho tabu
    var dragEl = tabRefs.current[state.tabId];
    if (!dragEl) { return; }
    var dragRect = dragEl.getBoundingClientRect();
    var dragCenter = dragRect.left + dragRect.width / 2 + dx;

    // najit cilovy index podle pozice
    var newTarget = state.originalIndex;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === state.tabId) { continue; }
      var otherEl = tabRefs.current[tabs[i].id];
      if (!otherEl) { continue; }
      var otherRect = otherEl.getBoundingClientRect();
      var otherCenter = otherRect.left + otherRect.width / 2;

      if (i < state.originalIndex && dragCenter < otherCenter) {
        newTarget = Math.min(newTarget, i);
      }
      if (i > state.originalIndex && dragCenter > otherCenter) {
        newTarget = Math.max(newTarget, i);
      }
    }
    setDragTargetIndex(newTarget);
  }

  function handlePointerUp() {
    var state = dragStateRef.current;
    if (!state) { return; }

    try {
      state.pointerId && tabRefs.current[state.tabId]?.releasePointerCapture(state.pointerId);
    } catch (_) { /* ignore */ }

    // provest finalni prerazeni
    if (dragTargetIndex !== state.originalIndex && dragTargetIndex >= 0) {
      onReorderTabs(state.originalIndex, dragTargetIndex);
    }

    dragStateRef.current = null;
    setDragTabId(null);
    setDragOffset(0);
    setDragTargetIndex(-1);
    setDragOriginalIndex(-1);
  }

  // vypocitat shift pro kazdy tab (kolik pixelu se posunout aby udelal misto)
  function getTabShift(tabId: string, tabIndex: number): number {
    if (dragTabId === null || dragOriginalIndex < 0 || dragTargetIndex < 0) { return 0; }
    if (tabId === dragTabId) { return 0; } // tazeny tab se posouva jinak

    var dragEl = tabRefs.current[dragTabId];
    if (!dragEl) { return 0; }
    var dragWidth = dragEl.getBoundingClientRect().width;

    // tab se posouva doleva/doprava aby udelal misto tazenemu tabu
    if (dragOriginalIndex < dragTargetIndex) {
      // tazeni doprava — taby mezi original a target se posunou doleva
      if (tabIndex > dragOriginalIndex && tabIndex <= dragTargetIndex) {
        return -dragWidth;
      }
    } else if (dragOriginalIndex > dragTargetIndex) {
      // tazeni doleva — taby mezi target a original se posunou doprava
      if (tabIndex >= dragTargetIndex && tabIndex < dragOriginalIndex) {
        return dragWidth;
      }
    }
    return 0;
  }

  return (
    <div className="tab-bar">
      <div className="tab-bar-tabs" ref={tabsContainerRef}>
        {/* sliding active indicator — skryt pri tazeni */}
        <div
          className={'tab-indicator' + (indicatorStyle.initialized ? ' ready' : '')}
          style={{
            transform: 'translateX(' + indicatorStyle.left + 'px)',
            width: indicatorStyle.width + 'px',
            opacity: dragTabId !== null ? 0 : 1,
          }}
        />

        {tabs.map(function (tab, tabIndex) {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingTabId;
          const isDragging = tab.id === dragTabId;
          const shift = getTabShift(tab.id, tabIndex);

          // styl pro tazeny tab — nasleduje mys, bez transition
          // styl pro ostatni taby — posunou se aby udelaly misto, s transition
          var tabStyle: React.CSSProperties | undefined;
          if (isDragging) {
            tabStyle = {
              transform: 'translateX(' + dragOffset + 'px)',
              transition: 'none',
            };
          } else if (shift !== 0) {
            tabStyle = {
              transform: 'translateX(' + shift + 'px)',
              transition: 'transform 0.2s ease',
            };
          } else if (dragTabId !== null) {
            // neni posunuty, ale drag probiha — resetovat s transition
            tabStyle = {
              transform: 'translateX(0px)',
              transition: 'transform 0.2s ease',
            };
          }
          return (
            <div
              key={tab.id}
              ref={function (el) { tabRefs.current[tab.id] = el; }}
              className={
                'tab-item' +
                (isActive ? ' active' : '') +
                (isDragging ? ' dragging' : '')
              }
              style={tabStyle}
              onClick={function () {
                if (!isEditing) {
                  onSwitchTab(tab.id);
                }
              }}
              onContextMenu={function (e) {
                e.preventDefault();
                setContextMenu({
                  isOpen: true,
                  x: e.clientX,
                  y: e.clientY,
                  tabId: tab.id,
                });
              }}
              onPointerDown={function (e) { handlePointerDown(e, tab.id); }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              draggable={false}
              onDragStart={function (e) { e.preventDefault(); }}
            >
              {isEditing ? (
                <>
                  {/* skryty span pro mereni sirky textu */}
                  <span ref={measureRef} className="tab-measure">{editValue || ' '}</span>
                  <input
                    ref={inputRef}
                    className="tab-rename-input"
                    value={editValue}
                    style={{ width: Math.max(inputWidth, 30) + 'px' }}
                    onChange={function (e) { setEditValue(e.target.value); }}
                    onBlur={handleEditConfirm}
                    onKeyDown={handleEditKeyDown}
                    onClick={function (e) { e.stopPropagation(); }}
                  />
                </>
              ) : (
                <span className="tab-name">{tab.name}</span>
              )}

              {/* tlacitko zavreni — jen pokud je vic nez 1 tab */}
              {tabs.length > 1 && !isEditing && (
                <button
                  className="tab-close"
                  draggable={false}
                  onPointerDown={function (e) { e.stopPropagation(); }}
                  onClick={function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    onCloseTab(tab.id);
                  }}
                  title="Zavřít tab"
                >
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
          );
        })}

        {/* tlacitko pridani noveho tabu */}
        <button
          className="tab-add"
          onClick={onAddTab}
          title="Nový tab"
        >
          <PlusIcon size={14} />
        </button>
      </div>

      {/* tab context menu */}
      {contextMenu.isOpen && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y, position: 'fixed', zIndex: 10000 }}
        >
          <div className="dropdown-menu">
            <div
              className="dropdown-item"
              onClick={handleContextMenuRename}
            >
              Přejmenovat
            </div>
            {tabs.length > 1 && (
              <>
                <div className="context-menu-separator" />
                <div
                  className="dropdown-item danger"
                  onClick={handleContextMenuClose}
                >
                  Zavřít tab
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
