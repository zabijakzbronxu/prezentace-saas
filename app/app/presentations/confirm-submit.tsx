"use client";

// Odesílací tlačítko s potvrzovací otázkou — pro nevratné akce (smazání fotky).
// Když uživatel potvrzení odmítne, formulář se neodešle.

export function ConfirmSubmit({
  message,
  style,
  children,
}: {
  message: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      style={style}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
