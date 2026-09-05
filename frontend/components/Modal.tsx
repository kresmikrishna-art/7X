"use client";
import React from "react";

export default function Modal({
  title, open, onClose, children, wide = false
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`formpanel ${wide ? "wide" : ""}`}>
        <div className="formhead">
          <h3>{title}</h3>
          <button className="iconbtn" onClick={onClose}>✕ Close</button>
        </div>
        <div className="formbody">{children}</div>
      </div>
    </div>
  );
}
