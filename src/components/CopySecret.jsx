import React from 'react';

export default function CopySecret({ text, label = '复制' }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板！请谨慎使用。');
  };

  return (
    <button onClick={handleCopy}>
      {label}
    </button>
  );
}