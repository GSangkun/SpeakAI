import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { TransparentOverlay } from './overlay';

/** @deprecated Use DropDownMenuV2 instead */
export function DropdownMenu({ menuItems, className }: {
    menuItems: { label: React.ReactNode; onClick: () => void }[];
    className?: string;
}) {
    return (
        <>
            <div className={`absolute z-50 bg-white border rounded-xl p-2 overflow-y-auto custom-scrollbar max-h-[300px] ${className}`}>
                {menuItems.map((item, index) => (
                    <div
                        key={index}
                        className="p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                        onClick={item.onClick}
                    >
                        {item.label}
                    </div>
                ))}
            </div>
        </>
    );
}

/** @deprecated Use DropDownMenuV2 instead */
export function DropdownMenuEntry({ label, onClick, className }: { label: React.ReactNode; onClick: () => void; className?: string }) {
    return <div className={`flex flex-row items-center p-2 pl-3 cursor-pointer hover:bg-gray-100 rounded-md ${className}`} onClick={onClick}>
        <div className="mr-2">{label}</div>
        <FaChevronDown size={12} />
    </div>
}

export function DropDownMenuV2({ entryLabel, entryClassName, menuItems, menuClassName }: {
    entryLabel: React.ReactNode;
    menuItems: { label: React.ReactNode; onClick: () => void }[];
    entryClassName?: string;
    menuClassName?: string;
}) {
    const [showMenu, setShowMenu] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');

    useEffect(() => {
        if (showMenu && triggerRef.current && menuRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const menuRect = menuRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // 检查菜单是否超出屏幕底部
            if (triggerRect.bottom + menuRect.height > viewportHeight) {
                // 将菜单显示在触发元素上方
                setMenuPosition('top');
            } else {
                // 将菜单显示在触发元素下方
                setMenuPosition('bottom');
            }
        }
    }, [showMenu]);

    return (
        <div>
            <div className="relative">
                <div
                    ref={triggerRef}
                    className={`flex flex-row items-center hover:bg-gray-100 cursor-pointer rounded-md p-2 pl-3 ${entryClassName}`}
                    onClick={() => setShowMenu(!showMenu)}>
                    <div className="mr-2">{entryLabel}</div>
                    <FaChevronDown size={12} />
                </div>
                {/* 下拉菜单 */}
                {showMenu &&
                    <div
                        ref={menuRef}
                        className={`absolute z-50 bg-white border rounded-xl p-2 overflow-y-auto custom-scrollbar max-h-[300px] w-max ${menuClassName} ${menuPosition === 'bottom' ? 'top-full' : 'bottom-full'}`}>
                        {menuItems.map((item, index) => (
                            <div
                                key={index}
                                className="p-2 cursor-pointer hover:bg-gray-100 rounded-md whitespace-nowrap"
                                onClick={() => {
                                    item.onClick();
                                    setShowMenu(false);
                                }}
                            >
                                {item.label}
                            </div>
                        ))}
                    </div>
                }
            </div>
            {showMenu && <TransparentOverlay onClick={() => setShowMenu(false)} />}
        </div>
    );
}
