import React from 'react';

export default function CopyButton({ text, label = '复制' }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板！');
  };

  return (
    <button onClick={handleCopy}>
      {label}
    </button>
  );
}