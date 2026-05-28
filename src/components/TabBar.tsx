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
    function handleClickOutside(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(function (prev) { return { ...prev, isOpen: false }; });
      }
    }
    // pouzit setTimeout aby se listener pridal az po aktualnim event cyklu
    var timer = setTimeout(function () {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return function () {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
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
      // maly delay aby se context menu stihl zavrit pred otevrenim inputu
      setTimeout(function () {
        setEditingTabId(tab.id);
        setEditValue(tab.name);
      }, 10);
    }
  }

  function handleContextMenuClose() {
    var tabId = contextMenu.tabId;
    setContextMenu(function (prev) { return { ...prev, isOpen: false }; });
    onCloseTab(tabId);
  }

  // drag & drop handlery
  function handleDragStart(e: React.DragEvent, tabId: string) {
    setDragTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
    // pouzit prazdny pruhledny obrazek jako ghost — tab se presouva sam
    var emptyImg = document.createElement('img');
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
  }

  function handleDragOver(e: React.DragEvent, tabId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragTabId !== null && tabId !== dragTabId) {
      // okamzite preradit tab — vizualne se presouva v realnem case
      var fromIndex = tabs.findIndex(function (t) { return t.id === dragTabId; });
      var toIndex = tabs.findIndex(function (t) { return t.id === tabId; });
      if (fromIndex !== -1 && toIndex !== -1) {
        onReorderTabs(fromIndex, toIndex);
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragTabId(null);
  }

  function handleDragEnd() {
    setDragTabId(null);
  }

  return (
    <div className="tab-bar">
      <div className="tab-bar-tabs" ref={tabsContainerRef}>
        {/* sliding active indicator */}
        <div
          className={'tab-indicator' + (indicatorStyle.initialized ? ' ready' : '')}
          style={{
            transform: 'translateX(' + indicatorStyle.left + 'px)',
            width: indicatorStyle.width + 'px',
          }}
        />

        {tabs.map(function (tab) {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingTabId;
          const isDragging = tab.id === dragTabId;

          return (
            <div
              key={tab.id}
              ref={function (el) { tabRefs.current[tab.id] = el; }}
              className={
                'tab-item' +
                (isActive ? ' active' : '') +
                (isDragging ? ' dragging' : '')
              }
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
              draggable={!isEditing}
              onDragStart={function (e) { handleDragStart(e, tab.id); }}
              onDragOver={function (e) { handleDragOver(e, tab.id); }}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
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
                  onMouseDown={function (e) { e.stopPropagation(); }}
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
