import React, { useState, useEffect } from 'react';
import { AuthUser } from '../types';

interface UserAvatarProps {
  user: AuthUser | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackInitial?: string;
}

export function UserAvatar({
  user,
  size = 'md',
  className = '',
  fallbackInitial
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [user?.avatar]);

  const initial =
    fallbackInitial ||
    (user?.name || user?.email || 'U').trim().charAt(0).toUpperCase() ||
    'U';

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-20 h-20 text-2xl'
  }[size];

  const hasAvatar = Boolean(user?.avatar && user.avatar.trim() !== '');

  return (
    <div
      className={`rounded-full flex items-center justify-center font-black select-none overflow-hidden shrink-0 ${sizeClasses} ${className}`}
    >
      {hasAvatar && !imgFailed ? (
        <img
          src={user!.avatar}
          alt={user?.name || 'User'}
          className="w-full h-full object-cover rounded-full"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};
