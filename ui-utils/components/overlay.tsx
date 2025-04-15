export function SemiTransparentOverlay({ onClick }: { onClick: () => void }) {
    return <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={onClick}></div>
}

export function TransparentOverlay({ onClick }: { onClick: () => void }) {
    return <div className="fixed inset-0 bg-transparent z-40" onClick={onClick}></div>
}