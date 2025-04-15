import React from "react";


export function IconCircleWrapper({
    children, width = 30, height = 30, className = "", onClick, allowClick = true
}: {
    children: React.ReactNode;
    width?: number;
    height?: number;
    className?: string;
    onClick?: () => void;
    allowClick?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-center rounded-full ${allowClick ? 'cursor-pointer hover:bg-gray-300' : 'cursor-not-allowed'} ${className}`}
            style={{ width: `${width}px`, height: `${height}px` }}
            onClick={() => { if (allowClick) onClick?.(); } }
        >
            {children}
        </div>
    );
}
