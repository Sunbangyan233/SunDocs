// src/components/ManualLastUpdate.js
import React, { useState, useEffect } from 'react';

const parseTime = (input) => {
  // 处理Unix时间戳（秒或毫秒）
  if (/^\d+$/.test(input)) {
    const timestamp = input.length <= 10 ? parseInt(input) * 1000 : parseInt(input);
    return new Date(timestamp);
  }
  // 处理ISO时间字符串
  return new Date(input);
};

const formatDate = (date) => {
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).replace('GMT+8', 'CST');
};

const calculateTimeDifference = (targetDate) => {
  const now = new Date();
  const diff = now - targetDate;

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000)
  };
};

export default function ManualLastUpdate({ time }) {
  const [lastUpdateDate, setLastUpdateDate] = useState(null);
  const [timeDiff, setTimeDiff] = useState({});

  useEffect(() => {
    try {
      const parsedDate = parseTime(time);
      if (isNaN(parsedDate)) throw new Error('Invalid date');
      setLastUpdateDate(parsedDate);
    } catch (e) {
      console.error('Invalid time format:', e);
      setLastUpdateDate(null);
    }
  }, [time]);

  useEffect(() => {
    if (!lastUpdateDate) return;

    const updateTimer = () => {
      setTimeDiff(calculateTimeDifference(lastUpdateDate));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastUpdateDate]);

  if (!lastUpdateDate) return null;

  return (
    <div className="alert alert--warning margin-bottom--md">
      <small>
        此页面的内容及资料需要长期更新，现存条目中资料未必是最新。
        <br />
        本列表的最后更新时间为 {formatDate(lastUpdateDate)}，
        距现在
        {timeDiff.days > 0 && ` ${timeDiff.days}天`}
        {timeDiff.hours > 0 && ` ${timeDiff.hours}小时`}
        {timeDiff.minutes > 0 && ` ${timeDiff.minutes}分`}
        {` ${timeDiff.seconds}秒`}。
        <br />
        如超过1周没更新，您可以前往 p.sunimg.top 提醒一下
      </small>
    </div>
  );
}